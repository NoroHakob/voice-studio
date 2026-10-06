"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, Copy, FileText, Languages } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLanguageLabel } from "@/features/speech-to-text/data/constants";

type Transcript = {
  id: string;
  filename: string;
  language: string;
  text: string;
  createdAt: Date;
};

export function TranscriptResult({
  transcript,
}: {
  transcript: Transcript | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!transcript) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="rounded-full bg-foreground p-3">
          <FileText className="size-5 text-background" />
        </div>
        <p className="font-semibold tracking-tight">
          Your transcript will appear here
        </p>
        <p className="max-w-64 text-sm text-muted-foreground">
          Upload an audio file, pick its language and press Transcribe.
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 lg:px-6 lg:pt-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight">
            {transcript.filename}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1 border-dashed">
              <Languages className="size-3" />
              {getLanguageLabel(transcript.language)}
            </Badge>
            <span>{format(new Date(transcript.createdAt), "PPp")}</span>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <p className="whitespace-pre-wrap text-base leading-relaxed tracking-tight">
          {transcript.text}
        </p>
      </div>
    </div>
  );
}
