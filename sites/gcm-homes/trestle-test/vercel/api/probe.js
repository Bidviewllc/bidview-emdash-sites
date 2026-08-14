/**
 * WAF probe — answers one question: can THIS host reach Trestle?
 *
 * Cloudflare Workers get a 403 Imperva/Incapsula block page on the token
 * endpoint (incident 1129000630050274626-38748860011057097, blocked egress
 * 172.70.208.90). This reports, from Vercel's egress, whether the token call
 * succeeds — and if not, echoes the WAF's incident ID and the client IP it saw,
 * which is exactly what Trestle support needs.
 */

import { TOKEN_URL, getToken, odata } from "../lib/trestle.js";

export default async function handler(req, res) {
  const out = { host: "vercel", region: process.env.VERCEL_REGION || null, steps: [] };

  // What does the outside world think our egress IP is? Useful for allowlisting.
  try {
    const ip = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(8000) });
    out.egressIp = (await ip.json()).ip;
  } catch {
    out.egressIp = "unknown";
  }

  // Step 1 — the token call is where Cloudflare gets blocked.
  try {
    const t0 = Date.now();
    const token = await getToken();
    out.steps.push({ step: "token", ok: true, ms: Date.now() - t0 });

    // Step 2 — a real data call, to be sure the WAF isn't blocking only OData.
    const t1 = Date.now();
    const d = await odata(token,
      `Property?$filter=${encodeURIComponent("StandardStatus eq 'Active'")}&$count=true&$top=1`);
    out.steps.push({
      step: "odata", ok: true, ms: Date.now() - t1,
      activeCount: d["@odata.count"] ?? null,
    });
    out.verdict = "NOT BLOCKED — Vercel can reach Trestle";
  } catch (e) {
    const body = e.body || String(e.message || e);
    out.steps.push({ step: "token/odata", ok: false, status: e.status || null });
    out.verdict = "BLOCKED — Trestle refused this host";
    out.incidentId = body.match(/incident ID: ([\d-]+)/i)?.[1]
      || body.match(/incident_id=([\d-]+)/i)?.[1] || null;
    out.wafSawClientIp = body.match(/cip=([\d.]+)/)?.[1] || null;
    out.isIncapsula = /incapsula|imperva|_Incapsula_Resource/i.test(body);
    out.rawExcerpt = body.slice(0, 300);
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(out);
}
