import { definePlugin } from "emdash";

/**
 * Resend email provider for emdash.
 *
 * emdash delivers all outgoing email (magic-link login, invites, etc.) through
 * the exclusive `email:deliver` hook. Registering this native plugin in the
 * `plugins: []` array of the emdash() integration makes it the active provider
 * (a single active provider is auto-selected), which flips
 * `emdash.email.isAvailable()` to true and enables "Sign in with email link".
 *
 * Sends via Resend from bidview.net (verified in this Resend workspace).
 *
 * The API key is read at runtime from the Cloudflare Worker secret
 * RESEND_API_KEY (set on both the staging and production workers via the CF API /
 * `wrangler secret put`), so it is NOT stored in source. If the secret is absent
 * on a worker, the deliver hook throws and email is simply unavailable there.
 */
const FROM = "New Leaf Hearing Care <noreply@bidview.net>";

/**
 * Read the Resend API key from the Cloudflare runtime env (a Worker secret named
 * RESEND_API_KEY). Read lazily inside the handler because `cloudflare:workers` is
 * only resolvable in the Workers runtime (guarded for local/node dev).
 */
async function getResendApiKey(): Promise<string | undefined> {
  try {
    const mod = await import("cloudflare:workers");
    const key = (mod as { env?: Record<string, unknown> }).env?.RESEND_API_KEY;
    if (typeof key === "string" && key) return key;
  } catch {
    // not in the Cloudflare Workers runtime (e.g. local dev)
  }
  if (typeof process !== "undefined" && process.env?.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }
  return undefined;
}

/**
 * Native-format plugin entrypoint. The emdash integration imports this named
 * `createPlugin` export for descriptors registered in `plugins: []`.
 */
export function createPlugin(_options?: Record<string, unknown>) {
  return definePlugin({
    id: "newleaf-resend-email",
    version: "1.0.0",
    capabilities: ["email:provide"],
    hooks: {
      "email:deliver": {
        exclusive: true,
        handler: async (event: { message: { to: string; subject: string; text: string; html?: string } }) => {
          const { message } = event;
          const apiKey = await getResendApiKey();
          if (!apiKey) {
            throw new Error("RESEND_API_KEY secret is not configured on this worker");
          }
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM,
              to: message.to,
              subject: message.subject,
              text: message.text,
              ...(message.html ? { html: message.html } : {}),
            }),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`Resend send failed: ${res.status} ${body}`);
          }
        },
      },
    },
  });
}
