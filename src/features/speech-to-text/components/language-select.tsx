"use client";

import { Languages } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STT_LANGUAGES } from "@/features/speech-to-text/data/constants";

export function LanguageSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <Languages className="size-4 text-muted-foreground" />
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {STT_LANGUAGES.map((language) => (
          <SelectItem key={language.value} value={language.value}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
