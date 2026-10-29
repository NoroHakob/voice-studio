"use client";

import { Headphones } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openSupportDesk } from "@/lib/support-desk";

export function SupportButton() {
  return (
    <Button variant="outline" size="sm" onClick={openSupportDesk}>
      <Headphones />
      <span className="hidden lg:block">Need help?</span>
    </Button>
  );
}