import Script from "next/script";

const DEFAULT_SUPPORTDESK_URL = "https://support-desk-ecru.vercel.app";

export function SupportDeskScript() {
  const workspaceId = process.env.NEXT_PUBLIC_SUPPORTDESK_WORKSPACE_ID;
  if (!workspaceId) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_SUPPORTDESK_URL ?? DEFAULT_SUPPORTDESK_URL;

  return (
    <Script
      id="supportdesk-embed"
      src={`${baseUrl}/embed.js`}
      data-workspace={workspaceId}
      strategy="afterInteractive"
    />
  );
}