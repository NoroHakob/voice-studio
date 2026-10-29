import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { chatterbox } from "@/lib/chatterbox-client";
import { hasActiveSubscription } from "@/lib/subscription";

// The first request after a cold start loads the model and can take a while.
export const maxDuration = 300;

const bodySchema = z.object({
  text: z.string().min(1).max(1000),
});

// SUPPORT_VOICE_ID if it exists, otherwise the first system voice by name.
async function getSupportVoiceKey() {
  if (env.SUPPORT_VOICE_ID) {
    const voice = await prisma.voice.findFirst({
      where: {
        id: env.SUPPORT_VOICE_ID,
        variant: "SYSTEM",
        r2ObjectKey: { not: null },
      },
      select: { r2ObjectKey: true },
    });
    if (voice?.r2ObjectKey) return voice.r2ObjectKey;
  }

  const fallback = await prisma.voice.findFirst({
    where: { variant: "SYSTEM", r2ObjectKey: { not: null } },
    orderBy: { name: "asc" },
    select: { r2ObjectKey: true },
  });

  return fallback?.r2ObjectKey ?? null;
}

// Reads a SupportDesk reply aloud. Nothing is saved to R2 or the database.
export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(orgId))) {
    return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
  }

  const validation = bodySchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!validation.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { text } = validation.data;

  const voiceKey = await getSupportVoiceKey();

  if (!voiceKey) {
    Sentry.logger.error("No support voice available", { orgId });
    return Response.json({ error: "Voice not available" }, { status: 500 });
  }

  const { data, error } = await chatterbox.POST("/generate", {
    body: {
      prompt: text,
      voice_key: voiceKey,
      temperature: 0.8,
      top_p: 0.95,
      top_k: 1000,
      repetition_penalty: 1.2,
      norm_loudness: true,
    },
    parseAs: "arrayBuffer",
  });

  if (error || !(data instanceof ArrayBuffer)) {
    Sentry.logger.error("Support speech generation failed", { orgId });
    return Response.json(
      { error: "Failed to generate audio" },
      { status: 502 },
    );
  }

  // Ingest usage event to Polar (fire-and-forget, don't block response)
  polar.events
    .ingest({
      events: [
        {
          name: env.POLAR_METER_TTS_GENERATION,
          externalCustomerId: orgId,
          metadata: { [env.POLAR_METER_TTS_PROPERTY]: text.length },
        },
      ],
    })
    .catch(() => {
      // Silently fail - don't break the user experience for metering errors
    });

  return new Response(data, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
