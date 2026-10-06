"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { AudioUploadPanel } from "../components/audio-upload-panel";
import { TranscriptResult } from "../components/transcript-result";
import { TranscriptHistory } from "../components/transcript-history";
import { SttSettingsPanel } from "../components/stt-settings-panel";

export function SpeechToTextView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { checkout } = useCheckout();

  const { data: transcripts } = useSuspenseQuery(
    trpc.transcriptions.getAll.queryOptions(),
  );

  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("en");
  const [selectedId, setSelectedId] = useState<string | null>(
    transcripts[0]?.id ?? null,
  );

  const refreshHistory = () =>
    queryClient.invalidateQueries(trpc.transcriptions.getAll.queryFilter());

  const transcribeMutation = useMutation({
    mutationFn: async ({ file, language }: { file: File; language: string }) => {
      const params = new URLSearchParams({ filename: file.name, language });
      const response = await fetch(`/api/transcriptions?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !body.id) {
        throw new Error(body.error ?? "Failed to transcribe audio");
      }

      return { id: body.id };
    },
    onSuccess: async ({ id }) => {
      await refreshHistory();
      setSelectedId(id);
      setFile(null);
      toast.success("Audio transcribed successfully!");
    },
    onError: (error) => {
      if (error.message === "SUBSCRIPTION_REQUIRED") {
        toast.error("Subscription required", {
          action: { label: "Subscribe", onClick: () => checkout() },
        });
      } else {
        toast.error(error.message);
      }
    },
  });

  const deleteMutation = useMutation(
    trpc.transcriptions.delete.mutationOptions({
      onSuccess: async (_, { id }) => {
        if (selectedId === id) setSelectedId(null);
        await refreshHistory();
        toast.success("Transcript deleted");
      },
      onError: () => toast.error("Failed to delete transcript"),
    }),
  );

  const isTranscribing = transcribeMutation.isPending;
  const selectedTranscript =
    transcripts.find((t) => t.id === selectedId) ?? null;

  const history = (
    <TranscriptHistory
      transcripts={transcripts}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onDelete={(id) => deleteMutation.mutate({ id })}
      deletingId={deleteMutation.isPending ? deleteMutation.variables.id : null}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        <AudioUploadPanel
          file={file}
          onFileChange={setFile}
          language={language}
          onLanguageChange={setLanguage}
          isTranscribing={isTranscribing}
          onTranscribe={() => {
            if (file) transcribeMutation.mutate({ file, language });
          }}
          onRejected={(message) => toast.error(message)}
        />
        <TranscriptResult transcript={selectedTranscript} />
        {/* On mobile the history sits under the result */}
        <div className="border-t lg:hidden">
          <p className="px-4 pt-4 text-sm font-medium tracking-tight">History</p>
          {history}
        </div>
      </div>
      <SttSettingsPanel
        language={language}
        onLanguageChange={setLanguage}
        disabled={isTranscribing}
        history={history}
      />
    </div>
  );
}
