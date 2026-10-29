// SupportDesk chat widget, loaded by <SupportDeskScript /> in the dashboard layout.
// The embed script exposes window.SupportDesk once it runs.

declare global {
  interface Window {
    SupportDesk?: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      isReady: () => boolean;
    };
  }
}

export function openSupportDesk() {
  window.SupportDesk?.open();
}