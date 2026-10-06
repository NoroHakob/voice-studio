import { SpeechToTextLayout } from "@/features/speech-to-text/views/speech-to-text-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SpeechToTextLayout>{children}</SpeechToTextLayout>;
}
