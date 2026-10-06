export const STT_MODEL_ID = "CohereLabs/cohere-transcribe-03-2026";

// Vercel rejects request bodies larger than 4.5 MB, so keep uploads below that.
export const STT_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const STT_LANGUAGES = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Italian", value: "it" },
  { label: "Spanish", value: "es" },
  { label: "Portuguese", value: "pt" },
  { label: "Greek", value: "el" },
  { label: "Dutch", value: "nl" },
  { label: "Polish", value: "pl" },
  { label: "Mandarin Chinese", value: "zh" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Vietnamese", value: "vi" },
  { label: "Arabic", value: "ar" },
] as const;

export const STT_LANGUAGE_VALUES = STT_LANGUAGES.map((l) => l.value) as [
  string,
  ...string[],
];

export function getLanguageLabel(value: string) {
  return STT_LANGUAGES.find((l) => l.value === value)?.label ?? value;
}
