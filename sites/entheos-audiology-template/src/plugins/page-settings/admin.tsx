/**
 * Admin UI for the page-settings plugin: a field that shows only on the Pages
 * records it belongs to.
 *
 * The admin doesn't tell a field widget which record is open, so the widget
 * reads the record id from the address (/_emdash/admin/content/site_pages/<id>)
 * and asks the API for that record's slug once. Until it knows (or on a new,
 * unsaved record) it shows the field, so nothing is ever hidden by mistake.
 *
 * Which records a field belongs to comes from src/data/page-settings.ts (the
 * admin passes select choices, not widget options, to select fields, so the
 * widget looks the field up by its id, "field-<slug>").
 */
import { useEffect, useState, type CSSProperties } from "react";
import { PAGE_SCOPED_FIELDS, PAGES } from "../../data/page-settings";

type Props = {
	value: unknown;
	onChange: (v: unknown) => void;
	label: string;
	id: string;
	required?: boolean;
	options?: unknown;
	validation?: { options?: string[] } | null;
	minimal?: boolean;
};

const slugCache = new Map<string, Promise<string | null>>();

function currentRecordId(): string | null {
	const m = location.pathname.match(/\/content\/site_pages\/([^/?#]+)/);
	return m && m[1] !== "new" ? decodeURIComponent(m[1]) : null;
}

function recordSlug(id: string): Promise<string | null> {
	let p = slugCache.get(id);
	if (!p) {
		p = fetch(`/_emdash/api/content/site_pages/${encodeURIComponent(id)}`, {
			credentials: "same-origin",
			headers: { "X-EmDash-Request": "1" },
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((j) => j?.data?.item?.slug ?? null)
			.catch(() => null);
		slugCache.set(id, p);
	}
	return p;
}

function useCurrentSlug(): string | null | undefined {
	const [slug, setSlug] = useState<string | null | undefined>(undefined);
	useEffect(() => {
		const id = currentRecordId();
		if (!id) return setSlug(null);
		let live = true;
		recordSlug(id).then((s) => live && setSlug(s));
		return () => {
			live = false;
		};
	}, []);
	return slug;
}

const box: CSSProperties = { display: "grid", gap: 6 };
const labelStyle: CSSProperties = { fontSize: 14, fontWeight: 500 };
const control: CSSProperties = {
	font: "inherit",
	fontSize: 14,
	padding: "8px 10px",
	borderRadius: 8,
	border: "1px solid var(--color-kumo-line, #d4d4d8)",
	background: "var(--color-kumo-base, #fff)",
	color: "inherit",
	maxWidth: 420,
};

/** Style rule hiding the photo and text fields that don't belong to this record. */
function photoRule(slug: string | null | undefined) {
	if (!slug) return null;
	const hide = Object.entries(PAGE_SCOPED_FIELDS)
		.filter(([, pages]) => !pages.includes(slug))
		.flatMap(([f]) => [`fieldset > div > #field-${f}`, `fieldset > div > :has(#field-${f})`]);
	return hide.length ? <style>{`${hide.join(", ")} { display: none !important; }`}</style> : null;
}

function ScopedField(props: Props) {
	const slug = useCurrentSlug();
	return (
		<>
			{photoRule(slug)}
			<ScopedControl {...props} slug={slug} />
		</>
	);
}

function ScopedControl({ value, onChange, label, id, validation, slug }: Props & { slug: string | null | undefined }) {
	const field = id.replace(/^field-/, "");
	const pages =
		field === "hero" ? PAGES.filter((p) => p.hero).map((p) => p.slug) : PAGES.filter((p) => p.settings.some((st) => st.field === field)).map((p) => p.slug);
	// Known record that this setting doesn't belong to: show nothing.
	if (slug && pages.length && !pages.includes(slug)) return null;

	const choices = validation?.options;
	if (choices && choices.length) {
		return (
			<div style={box}>
				<label htmlFor={id} style={labelStyle}>
					{label}
				</label>
				<select id={id} style={control} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}>
					{typeof value !== "string" || !choices.includes(value) ? <option value="">Choose…</option> : null}
					{choices.map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
			</div>
		);
	}
	return (
		<label htmlFor={id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
			<input id={id} type="checkbox" style={{ width: 18, height: 18 }} checked={value === true || value === 1} onChange={(e) => onChange(e.target.checked)} />
			{label}
		</label>
	);
}

export const fields = { scoped: ScopedField };
