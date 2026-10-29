// SupportDesk chat widget, loaded by <SupportDeskScript /> in the dashboard layout.
// The embed script exposes window.SupportDesk once it runs.

declare global {
  interface Window {
    SupportDesk?: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      isReady: () => boolean;
      // Opens the widget and sends the message as the visitor (queued if not ready).
      send: (body: string) => void;
    };
  }
}

// Fired on window for each new reply in the conversation. body is Markdown.
export const SUPPORTDESK_REPLY_EVENT = "supportdesk:reply";

export type SupportDeskReply = {
  id: string;
  author: "agent" | "member";
  body: string;
};

export function openSupportDesk() {
  window.SupportDesk?.open();
}
