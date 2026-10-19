/**
 * Admin "Marketing & tracking" page (Admins only): lead email and spam
 * settings, tracking IDs and custom code, each with an on/off switch.
 * Item list: src/data/marketing-items.ts.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { MARKETING_SECTIONS, type MarketingItem } from "../../data/marketing-items";

type State = { key: string; on: boolean; value: string; saved?: boolean };

const api = async (path: string, init?: RequestInit) => {
	const r = await fetch(`/_emdash/api/plugins/marketing/${path}`, {
		credentials: "same-origin",
		...init,
		headers: { "X-EmDash-Request": "1", "content-type": "application/json", ...(init?.headers ?? {}) },
	});
	const j = await r.json().catch(() => ({}));
	if (!r.ok) throw Object.assign(new Error(j?.error?.message ?? `Request failed (${r.status})`), { status: r.status });
	return (j?.data ?? j) as any;
};

const page: CSSProperties = { maxWidth: 880, margin: "0 auto", padding: "32px 24px 96px", display: "grid", gap: 24 };
const card: CSSProperties = { border: "1px solid var(--color-kumo-line, #e4e4e7)", borderRadius: 12, padding: 20, display: "grid", gap: 18, background: "var(--color-kumo-base, #fff)" };
const muted: CSSProperties = { opacity: 0.7, fontSize: 14, margin: 0, lineHeight: 1.45 };
const field: CSSProperties = { font: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-kumo-line, #d4d4d8)", background: "var(--color-kumo-base, #fff)", color: "inherit", width: "100%", boxSizing: "border-box" };
const btn: CSSProperties = { font: "inherit", fontSize: 14, fontWeight: 600, padding: "8px 18px", borderRadius: 8, border: "1px solid transparent", background: "#0f5e6b", color: "#fff", cursor: "pointer" };

function Item({ def, st, set }: { def: MarketingItem; st: State; set: (s: State) => void }) {
	const id = `mk-${def.key}`;
	return (
		<div style={{ display: "grid", gap: 6 }}>
			<label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600 }}>
				<input type="checkbox" checked={st.on} onChange={(e) => set({ ...st, on: e.target.checked })} aria-describedby={def.help ? `${id}-help` : undefined} />
				{def.label}
				<span style={{ ...muted, fontWeight: 400 }}>{st.on ? "On" : "Off"}</span>
			</label>
			{def.kind === "code" ? (
				<textarea id={id} aria-label={def.label} style={{ ...field, fontFamily: "ui-monospace, Consolas, monospace", minHeight: 90 }} value={st.value} placeholder={def.placeholder} onChange={(e) => set({ ...st, value: e.target.value })} />
			) : def.kind === "secret" ? (
				<input id={id} aria-label={def.label} style={field} type="password" autoComplete="off" value={st.value} placeholder={st.saved ? "Saved. Type a new one to replace it." : def.placeholder} onChange={(e) => set({ ...st, value: e.target.value })} />
			) : def.kind === "text" ? (
				<input id={id} aria-label={def.label} style={field} type="text" value={st.value} placeholder={def.placeholder} onChange={(e) => set({ ...st, value: e.target.value })} />
			) : null}
			{def.help && <p id={`${id}-help`} style={muted}>{def.help}</p>}
		</div>
	);
}

function MarketingPage() {
	const [items, setItems] = useState<Record<string, State> | null>(null);
	const [error, setError] = useState("");
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);

	const load = () =>
		api("get").then(
			(d) => setItems(Object.fromEntries((d.items as State[]).map((i) => [i.key, i]))),
			(e) => setError(e.status === 403 ? "This page is for Admins (Bidview and Entheos)." : String(e.message ?? e)),
		);
	useEffect(() => {
		load();
	}, []);

	const save = async () => {
		if (!items) return;
		setBusy(true);
		setNote("");
		try {
			await api("save", { method: "POST", body: JSON.stringify({ items: Object.values(items).map(({ key, on, value }) => ({ key, on, value })) }) });
			await load();
			setNote("Saved. The site uses the new settings straight away.");
		} catch (e) {
			setError(String((e as Error).message ?? e));
		} finally {
			setBusy(false);
		}
	};

	const title = <h1 style={{ margin: 0, fontSize: 28 }}>Marketing &amp; tracking</h1>;
	if (error) return <div style={page}>{title}<p role="alert">{error}</p></div>;
	if (!items) return <div style={page}>{title}<p>Loading…</p></div>;

	return (
		<div style={page}>
			<div style={{ display: "grid", gap: 8 }}>
				{title}
				<p style={muted}>
					For Bidview and Entheos (Admins). Switch each item on when the practice's marketing calls for it. Tracking and custom code only run on the live
					domain, never on previews.
				</p>
			</div>
			{MARKETING_SECTIONS.map((s, n) => (
				<section key={s.title} style={card} aria-labelledby={`mk-sec-${n}`}>
					<div style={{ display: "grid", gap: 4 }}>
						<h2 id={`mk-sec-${n}`} style={{ margin: 0, fontSize: 18 }}>{s.title}</h2>
						<p style={muted}>{s.intro}</p>
					</div>
					{s.items.map((def) => (
						<Item key={def.key} def={def} st={items[def.key]} set={(v) => setItems({ ...items, [def.key]: v })} />
					))}
				</section>
			))}
			<div style={{ position: "sticky", bottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
				<button type="button" style={btn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
				{note && <span role="status" style={muted}>{note}</span>}
			</div>
		</div>
	);
}

export const pages = { "/": MarketingPage };
