"use client";

import { useDropzone } from "react-dropzone";
import { FileAudio, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STT_MAX_UPLOAD_BYTES } from "@/features/speech-to-text/data/constants";
import { LanguageSelect } from "./language-select";

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AudioUploadPanel({
  file,
  onFileChange,
  language,
  onLanguageChange,
  isTranscribing,
  onTranscribe,
  onRejected,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  isTranscribing: boolean;
  onTranscribe: () => void;
  onRejected: (message: string) => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "audio/*": [] },
    maxFiles: 1,
    maxSize: STT_MAX_UPLOAD_BYTES,
    disabled: isTranscribing,
    onDropAccepted: (files) => onFileChange(files[0] ?? null),
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      onRejected(
        code === "file-too-large"
          ? "Audio file exceeds the 4 MB size limit"
          : "Please upload a single audio file",
      );
    },
  });

  return (
    <div className="flex shrink-0 flex-col gap-4 border-b p-4 lg:p-6">
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground">
            <FileAudio className="size-5 text-background" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium tracking-tight">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatSize(file.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onFileChange(null)}
            disabled={isTranscribing}
            aria-label="Remove file"
          >
            <X />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center transition-colors hover:bg-muted/50",
            isDragActive && "border-foreground bg-muted/50",
          )}
        >
          <input {...getInputProps()} />
          <div className="rounded-full bg-muted p-3">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium tracking-tight">
            {isDragActive ? "Drop the audio here" : "Upload an audio file"}
          </p>
          <p className="text-xs text-muted-foreground">
            Drag and drop or click to browse · MP3, WAV, M4A · up to 4 MB
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        {/* On desktop the language lives in the Settings tab */}
        <div className="lg:hidden">
          <LanguageSelect
            value={language}
            onChange={onLanguageChange}
            disabled={isTranscribing}
          />
        </div>
        <Button
          type="button"
          onClick={onTranscribe}
          disabled={!file || isTranscribing}
          className="w-full lg:w-auto"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="animate-spin" />
              Transcribing...
            </>
          ) : (
            "Transcribe"
          )}
        </Button>
      </div>
      {isTranscribing && (
        <p className="text-xs text-muted-foreground lg:text-right">
          The first transcription can take up to a minute while the model starts.
        </p>
      )}
    </div>
  );
}
