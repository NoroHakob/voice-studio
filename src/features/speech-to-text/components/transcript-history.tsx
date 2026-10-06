"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, FileText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLanguageLabel } from "@/features/speech-to-text/data/constants";

type TranscriptListItem = {
  id: string;
  filename: string;
  language: string;
  text: string;
  createdAt: Date;
};

export function TranscriptHistory({
  transcripts,
  selectedId,
  onSelect,
  onDelete,
  deletingId,
}: {
  transcripts: TranscriptListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (!transcripts.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8">
        <div className="relative flex w-25 items-center justify-center">
          <div className="absolute left-0 -rotate-30 rounded-full bg-muted p-3">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="relative z-10 rounded-full bg-foreground p-3">
            <FileText className="size-4 text-background" />
          </div>
          <div className="absolute right-0 rotate-30 rounded-full bg-muted p-3">
            <Clock className="size-4 text-muted-foreground" />
          </div>
        </div>
        <p className="font-semibold tracking-tight text-foreground">
          No transcripts yet
        </p>
        <p className="max-w-48 text-center text-xs text-muted-foreground">
          Transcribe some audio and it will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {transcripts.map((transcript) => (
        <div
          key={transcript.id}
          className={cn(
            "group flex items-center gap-2 rounded-lg p-3 transition-colors hover:bg-muted",
            selectedId === transcript.id && "bg-muted",
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(transcript.id)}
            className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
          >
            <p className="truncate text-sm font-medium text-foreground">
              {transcript.text}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{transcript.filename}</span>
              <span>&middot;</span>
              <span className="shrink-0">
                {getLanguageLabel(transcript.language)}
              </span>
              <span>&middot;</span>
              <span className="shrink-0">
                {formatDistanceToNow(new Date(transcript.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(transcript.id)}
            disabled={deletingId === transcript.id}
            aria-label="Delete transcript"
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
