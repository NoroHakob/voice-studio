import type { Metadata } from "next";

import { SpeechToTextView } from "@/features/speech-to-text/views/speech-to-text-view";
import { trpc, HydrateClient, prefetch } from "@/trpc/server";

export const metadata: Metadata = { title: "Speech to Text" };

export default async function SpeechToTextPage() {
  prefetch(trpc.transcriptions.getAll.queryOptions());

  return (
    <HydrateClient>
      <SpeechToTextView />
    </HydrateClient>
  );
}
