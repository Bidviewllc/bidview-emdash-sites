export async function alert(env, text, fetchFn = fetch) {
  console.error("[reviews-sync]", text);
  if (!env.SLACK_ALERTS_WEBHOOK) return;
  try {
    await fetchFn(env.SLACK_ALERTS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `:rotating_light: ${text}` }),
    });
  } catch {
    // An alert failure must never break the sync.
  }
}
