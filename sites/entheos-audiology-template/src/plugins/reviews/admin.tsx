/**
 * Admin "Reviews" screen: every Google review on the site, by office, with a
 * Hide / Show switch. Hidden reviews stay in the database (so the weekly sync
 * can't bring them back) but never appear on the site. Google's rating and
 * review count are Google's own totals and don't change when a review is hidden.
 */
import { useEffect, useState, type CSSProperties } from "react";

type Review = { review_id: string; location: string; author: string; rating: number | null; text: string | null; published_at: string | null; time_ago: string | null; review_url: string | null; hidden: number | null };
type Meta = { location: string; title: string | null; rating: number | null; votes_count: number | null; synced_at: string | null };
type Data = { locations: Meta[]; reviews: Review[]; notSetUp?: boolean };

const api = async (path: string, init?: RequestInit) => {
	const r = await fetch(`/_emdash/api/plugins/reviews/${path}`, {
		credentials: "same-origin",
		...init,
		headers: { "X-EmDash-Request": "1", "content-type": "application/json", ...(init?.headers ?? {}) },
	});
	const j = await r.json().catch(() => ({}));
	if (!r.ok) throw new Error(j?.error?.message ?? `Request failed (${r.status})`);
	return (j?.data ?? j) as any;
};

const page: CSSProperties = { maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px", display: "grid", gap: 24 };
const card: CSSProperties = { border: "1px solid var(--color-kumo-line, #e4e4e7)", borderRadius: 12, padding: 16, display: "grid", gap: 8, background: "var(--color-kumo-base, #fff)" };
const muted: CSSProperties = { opacity: 0.7, fontSize: 14 };
const btn: CSSProperties = { font: "inherit", fontSize: 14, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--color-kumo-line, #d4d4d8)", background: "var(--color-kumo-base, #fff)", color: "inherit", cursor: "pointer", whiteSpace: "nowrap" };

const when = (r: Review) => (r.published_at ? new Date(r.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : r.time_ago ?? "");
const stars = (n: number | null) => (n ? "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n)) : "No rating");

function ReviewsPage() {
	const [data, setData] = useState<Data | null>(null);
	const [offices, setOffices] = useState<Record<string, string>>({});
	const [error, setError] = useState("");
	const [busy, setBusy] = useState("");
	const [show, setShow] = useState<"all" | "shown" | "hidden">("all");

	useEffect(() => {
		api("list").then(setData, (e) => setError(String(e.message ?? e)));
		fetch("/_emdash/api/content/offices?limit=50", { credentials: "same-origin", headers: { "X-EmDash-Request": "1" } })
			.then((r) => r.json())
			.then((j) => setOffices(Object.fromEntries((j?.data?.items ?? []).map((o: any) => [o.slug, o.data?.title ?? o.slug]))))
			.catch(() => {});
	}, []);

	const toggle = async (r: Review) => {
		setBusy(r.review_id);
		try {
			const res = await api("hide", { method: "POST", body: JSON.stringify({ id: r.review_id, hidden: !r.hidden }) });
			setData((d) => d && { ...d, reviews: d.reviews.map((x) => (x.review_id === r.review_id ? { ...x, hidden: res.hidden ? 1 : 0 } : x)) });
		} catch (e) {
			setError(String((e as Error).message ?? e));
		} finally {
			setBusy("");
		}
	};

	if (error) return <div style={page}><h1>Reviews</h1><p role="alert">{error}</p></div>;
	if (!data) return <div style={page}><h1>Reviews</h1><p>Loading…</p></div>;

	const locs = [...new Set([...data.locations.map((m) => m.location), ...data.reviews.map((r) => r.location)])];
	const filtered = data.reviews.filter((r) => (show === "all" ? true : show === "hidden" ? !!r.hidden : !r.hidden));

	return (
		<div style={page}>
			<div style={{ display: "grid", gap: 8 }}>
				<h1 style={{ margin: 0, fontSize: 28 }}>Reviews</h1>
				<p style={{ margin: 0, ...muted }}>
					Google reviews for each office, updated every week. Hide a review to keep it off the site (for example, one that mentions a patient's health). Hidden
					reviews stay hidden after the next update. The star rating and review count are Google's own totals and don't change.
				</p>
			</div>
			{data.notSetUp || data.reviews.length === 0 ? (
				<div style={card}>
					<b>No reviews yet.</b>
					<span style={muted}>Reviews appear here after the first weekly update. Until then the site shows its sample reviews.</span>
				</div>
			) : (
				<>
					<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
						{locs.map((l) => {
							const m = data.locations.find((x) => x.location === l);
							const n = data.reviews.filter((r) => r.location === l);
							return (
								<div key={l} style={{ ...card, minWidth: 220 }}>
									<b>{offices[l] ?? l}</b>
									<span style={muted}>
										{m?.rating ?? "–"} ★ from {m?.votes_count ?? "–"} Google reviews · {n.filter((r) => !r.hidden).length} shown, {n.filter((r) => r.hidden).length} hidden
									</span>
									{m?.synced_at && <span style={muted}>Last updated {new Date(m.synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
								</div>
							);
						})}
					</div>
					<label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
						Show
						<select value={show} onChange={(e) => setShow(e.target.value as typeof show)} style={btn}>
							<option value="all">All reviews</option>
							<option value="shown">Shown on the site</option>
							<option value="hidden">Hidden</option>
						</select>
					</label>
					<div style={{ display: "grid", gap: 12 }}>
						{filtered.map((r) => (
							<div key={r.review_id} style={{ ...card, opacity: r.hidden ? 0.6 : 1 }}>
								<div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
									<div style={{ display: "grid", gap: 4 }}>
										<b>
											{r.author || "Google user"} <span style={{ color: "#b45309", fontWeight: 400 }} aria-label={`${r.rating ?? 0} out of 5 stars`}>{stars(r.rating)}</span>
										</b>
										<span style={muted}>
											{offices[r.location] ?? r.location} · {when(r)}
											{r.hidden ? " · Hidden" : ""}
										</span>
									</div>
									<button type="button" style={btn} disabled={busy === r.review_id} onClick={() => toggle(r)} aria-pressed={!!r.hidden}>
										{r.hidden ? "Show on site" : "Hide from site"}
									</button>
								</div>
								<p style={{ margin: 0, lineHeight: 1.5 }}>{r.text || <i style={muted}>No text (star rating only; not shown on the site)</i>}</p>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export const pages = { "/": ReviewsPage };
