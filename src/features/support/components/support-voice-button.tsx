"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type RecordRTCType from "recordrtc";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SUPPORTDESK_REPLY_EVENT,
  type SupportDeskReply,
} from "@/lib/support-desk";
import { STT_LANGUAGE_VALUES } from "@/features/speech-to-text/data/constants";

type Phase = "idle" | "recording" | "transcribing" | "speaking";

const MAX_RECORDING_SECONDS = 60;
const MAX_SPEECH_CHARS = 1000;
const GENERIC_ERROR = "Voice support failed. Please try again.";

const ARIA_LABELS: Record<Phase, string> = {
  idle: "Talk to support",
  recording: "Stop recording",
  transcribing: "Transcribing your message",
  speaking: "Stop reading replies",
};

function getLanguage() {
  const prefix = navigator.language?.split("-")[0]?.toLowerCase();
  return prefix && STT_LANGUAGE_VALUES.includes(prefix) ? prefix : "en";
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/(^|\W)_(.+?)_(?=\W|$)/g, "$1$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function toastForStatus(status: number) {
  if (status === 403) {
    toast.error("Voice support needs an active subscription");
  } else if (status === 422) {
    toast.error("No speech detected");
  } else {
    toast.error(GENERIC_ERROR);
  }
}

function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

export function SupportVoiceButton() {
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const mountedRef = useRef(false);
  const startingRef = useRef(false);
  const recorderRef = useRef<RecordRTCType | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Replies are only read aloud after the visitor has spoken.
  const voiceModeRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const seenRepliesRef = useRef(new Set<string>());
  const processingRef = useRef(false);
  // Bumped on every stop so in-flight playback loops can tell they are stale.
  const sessionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const finishAudioRef = useRef<(() => void) | null>(null);

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhaseState(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  const releaseMic = useCallback(() => {
    clearTimers();
    if (recorderRef.current) {
      recorderRef.current.destroy();
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [clearTimers]);

  const stopSpeaking = useCallback(() => {
    sessionRef.current += 1;
    voiceModeRef.current = false;
    queueRef.current = [];
    processingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    finishAudioRef.current?.();
  }, []);

  const playAudio = useCallback((blob: Blob) => {
    return new Promise<void>((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      const finish = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        if (finishAudioRef.current === finish) finishAudioRef.current = null;
        URL.revokeObjectURL(url);
        resolve();
      };

      finishAudioRef.current = finish;
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch((err) => {
        if (!isAbortError(err)) toast.error(GENERIC_ERROR);
        finish();
      });
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || phaseRef.current !== "idle") return;
    if (queueRef.current.length === 0) return;

    processingRef.current = true;
    const session = sessionRef.current;
    const isStale = () =>
      session !== sessionRef.current || !mountedRef.current;

    setPhase("speaking");

    try {
      while (queueRef.current.length > 0 && !isStale()) {
        const text = queueRef.current.shift()!;
        const response = await fetch("/api/support/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abortRef.current?.signal,
        });
        if (isStale()) break;

        if (!response.ok) {
          toastForStatus(response.status);
          if (response.status === 403) {
            voiceModeRef.current = false;
            queueRef.current = [];
          }
          continue;
        }

        const blob = await response.blob();
        if (isStale()) break;

        await playAudio(blob);
      }
    } catch (err) {
      if (!isAbortError(err) && !isStale()) toast.error(GENERIC_ERROR);
    } finally {
      if (session === sessionRef.current) {
        processingRef.current = false;
        // Widen: TS keeps the "idle" narrowing from the guard above across awaits.
        if ((phaseRef.current as Phase) === "speaking") setPhase("idle");
      }
    }
  }, [playAudio, setPhase]);

  const transcribe = useCallback(
    async (blob: Blob) => {
      try {
        const response = await fetch(
          `/api/support/voice/transcribe?language=${getLanguage()}`,
          {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: blob,
            signal: abortRef.current?.signal,
          },
        );

        if (!response.ok) {
          toastForStatus(response.status);
          return;
        }

        const { text } = (await response.json()) as { text?: string };
        if (!text) {
          toastForStatus(422);
          return;
        }

        if (!window.SupportDesk?.send) {
          toast.error(GENERIC_ERROR);
          return;
        }

        window.SupportDesk.send(text);
        voiceModeRef.current = true;
      } catch (err) {
        if (!isAbortError(err)) toast.error(GENERIC_ERROR);
      } finally {
        if (phaseRef.current === "transcribing") setPhase("idle");
        // Replies that arrived while recording or transcribing.
        void processQueue();
      }
    },
    [processQueue, setPhase],
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || phaseRef.current !== "recording") return;

    clearTimers();
    setPhase("transcribing");

    try {
      recorder.stopRecording(() => {
        const blob = recorder.getBlob();
        releaseMic();
        if (!mountedRef.current) return;
        void transcribe(blob);
      });
    } catch {
      releaseMic();
      toast.error(GENERIC_ERROR);
      setPhase("idle");
    }
  }, [clearTimers, releaseMic, setPhase, transcribe]);

  const startRecording = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          toast.error(
            "Microphone access denied. Please allow microphone access in your browser settings.",
          );
        } else {
          toast.error(GENERIC_ERROR);
        }
        return;
      }

      streamRef.current = stream;
      if (!mountedRef.current) {
        releaseMic();
        return;
      }

      try {
        const { default: RecordRTC, StereoAudioRecorder } = await import(
          "recordrtc"
        );

        const recorder = new RecordRTC(stream, {
          recorderType: StereoAudioRecorder,
          mimeType: "audio/wav",
          numberOfAudioChannels: 1,
          desiredSampRate: 16000,
        });

        recorderRef.current = recorder;
        if (!mountedRef.current) {
          releaseMic();
          return;
        }
        recorder.startRecording();
      } catch {
        releaseMic();
        toast.error(GENERIC_ERROR);
        return;
      }

      setElapsed(0);
      setPhase("recording");

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 250);
      autoStopRef.current = setTimeout(
        stopRecording,
        MAX_RECORDING_SECONDS * 1000,
      );
    } finally {
      startingRef.current = false;
    }
  }, [releaseMic, setPhase, stopRecording]);

  const handleClick = () => {
    switch (phaseRef.current) {
      case "idle":
        void startRecording();
        break;
      case "recording":
        stopRecording();
        break;
      case "speaking":
        stopSpeaking();
        setPhase("idle");
        break;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    abortRef.current = new AbortController();

    return () => {
      mountedRef.current = false;
      stopSpeaking();
      abortRef.current?.abort();
      releaseMic();
    };
  }, [releaseMic, stopSpeaking]);

  useEffect(() => {
    const onReply = (event: Event) => {
      if (!voiceModeRef.current) return;

      const reply = (event as CustomEvent<SupportDeskReply>).detail;
      if (!reply || typeof reply.body !== "string") return;
      if (seenRepliesRef.current.has(reply.id)) return;
      seenRepliesRef.current.add(reply.id);

      const text = stripMarkdown(reply.body).slice(0, MAX_SPEECH_CHARS);
      if (!text) return;

      queueRef.current.push(text);
      void processQueue();
    };

    window.addEventListener(SUPPORTDESK_REPLY_EVENT, onReply);
    return () => window.removeEventListener(SUPPORTDESK_REPLY_EVENT, onReply);
  }, [processQueue]);

  const isRecording = phase === "recording";

  return (
    <div
      className="fixed size-14"
      style={{ bottom: 20, right: 88, zIndex: 2147483645 }}
    >
      {isRecording && (
        <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
      )}
      <Button
        type="button"
        variant={isRecording ? "destructive" : "default"}
        aria-label={ARIA_LABELS[phase]}
        title={ARIA_LABELS[phase]}
        disabled={phase === "transcribing"}
        onClick={handleClick}
        className={cn(
          "relative size-14 flex-col gap-0.5 rounded-full shadow-lg",
          "[&_svg:not([class*='size-'])]:size-5",
        )}
      >
        {phase === "idle" && <Mic />}
        {phase === "recording" && (
          <>
            <Square className="fill-current" />
            <span className="text-[10px] leading-none tabular-nums">
              {elapsed}s
            </span>
          </>
        )}
        {phase === "transcribing" && <Loader2 className="animate-spin" />}
        {phase === "speaking" && <Volume2 />}
      </Button>
    </div>
  );
}
