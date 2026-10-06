import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import {
  STT_LANGUAGE_VALUES,
  STT_MAX_UPLOAD_BYTES,
  STT_MODEL_ID,
} from "@/features/speech-to-text/data/constants";

// The first request after a cold start loads the model on Modal and can take a while.
export const maxDuration = 300;

const querySchema = z.object({
  filename: z.string().min(1).max(255),
  language: z.enum(STT_LANGUAGE_VALUES),
});

type ModalResponse = {
  text?: string | string[];
  model_id?: string;
  language?: string;
  error?: string;
};

export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Same rule as TTS: transcription needs an active subscription
  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: orgId,
    });
    if ((customerState.activeSubscriptions ?? []).length === 0) {
      return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
  }

  const url = new URL(request.url);
  const validation = querySchema.safeParse({
    filename: url.searchParams.get("filename"),
    language: url.searchParams.get("language"),
  });

  if (!validation.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { filename, language } = validation.data;

  const fileBuffer = await request.arrayBuffer();

  if (!fileBuffer.byteLength) {
    return Response.json(
      { error: "Please upload an audio file" },
      { status: 400 },
    );
  }

  if (fileBuffer.byteLength > STT_MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "Audio file exceeds the 4 MB size limit" },
      { status: 413 },
    );
  }

  let result: ModalResponse;
  try {
    const response = await fetch(env.MODAL_STT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_base64: Buffer.from(fileBuffer).toString("base64"),
        language,
      }),
    });

    if (!response.ok) {
      Sentry.logger.error("Transcription request failed", {
        orgId,
        status: response.status,
      });
      return Response.json(
        { error: "Transcription failed. Please retry." },
        { status: 502 },
      );
    }

    result = (await response.json()) as ModalResponse;
  } catch {
    return Response.json(
      { error: "Transcription service is unavailable. Please retry." },
      { status: 502 },
    );
  }

  const text = Array.isArray(result.text)
    ? result.text.filter(Boolean).join("\n\n")
    : result.text;

  if (result.error || !text) {
    return Response.json(
      { error: result.error ?? "No speech was detected in this file" },
      { status: 422 },
    );
  }

  const transcript = await prisma.transcript.create({
    data: {
      orgId,
      filename,
      language: result.language ?? language,
      text,
      modelId: result.model_id ?? STT_MODEL_ID,
    },
    select: { id: true },
  });

  Sentry.logger.info("Audio transcribed", {
    orgId,
    transcriptId: transcript.id,
  });

  // Ingest usage event to Polar (fire-and-forget, don't block response)
  if (env.POLAR_METER_STT_TRANSCRIPTION) {
    polar.events
      .ingest({
        events: [
          {
            name: env.POLAR_METER_STT_TRANSCRIPTION,
            externalCustomerId: orgId,
            metadata: {},
            timestamp: new Date(),
          },
        ],
      })
      .catch(() => {
        // Silently fail - don't break the user experience for metering errors
      });
  }

  return Response.json({ id: transcript.id }, { status: 201 });
}
