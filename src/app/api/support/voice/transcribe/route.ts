import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { hasActiveSubscription } from "@/lib/subscription";
import {
  STT_LANGUAGE_VALUES,
  STT_MAX_UPLOAD_BYTES,
} from "@/features/speech-to-text/data/constants";

// The first request after a cold start loads the model on Modal and can take a while.
export const maxDuration = 300;

const languageSchema = z.enum(STT_LANGUAGE_VALUES).default("en");

type ModalResponse = {
  text?: string | string[];
  model_id?: string;
  language?: string;
  error?: string;
};

// Transcribes a voice message for the SupportDesk widget.
// Unlike /api/transcriptions, nothing is saved to the transcript history.
export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(orgId))) {
    return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
  }

  const url = new URL(request.url);
  const validation = languageSchema.safeParse(
    url.searchParams.get("language") ?? undefined,
  );

  if (!validation.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const language = validation.data;

  const fileBuffer = await request.arrayBuffer();

  if (!fileBuffer.byteLength) {
    return Response.json({ error: "Please record a message" }, { status: 400 });
  }

  if (fileBuffer.byteLength > STT_MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "Recording exceeds the 4 MB size limit" },
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
      Sentry.logger.error("Support transcription request failed", {
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

  if (result.error || !text?.trim()) {
    return Response.json(
      { error: result.error ?? "No speech was detected" },
      { status: 422 },
    );
  }

  // Ingest usage event to Polar (fire-and-forget, don't block response)
  if (env.POLAR_METER_STT_TRANSCRIPTION) {
    polar.events
      .ingest({
        events: [
          {
            name: env.POLAR_METER_STT_TRANSCRIPTION,
            externalCustomerId: orgId,
            metadata: {},
          },
        ],
      })
      .catch((err) => console.error("[polar] stt event failed", err));
  } else {
    console.warn("[polar] POLAR_METER_STT_TRANSCRIPTION is not set");
  }

  return Response.json({ text: text.trim() });
}
