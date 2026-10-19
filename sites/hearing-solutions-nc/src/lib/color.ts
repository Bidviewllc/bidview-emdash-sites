// Practice colour logic, ported exactly from the design boards (HANDOFF section 3).
// The same maths runs in the browser for live colour changes: see
// src/components/ReviewControls.astro, which must stay in step with this file.

const INK = "#1B1F23";
const WHITE = "#FFFFFF";

export const hex = (h: string) => {
	h = String(h).replace("#", "");
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	return h;
};

export const lum = (h: string) => {
	h = hex(h);
	const x = [0, 2, 4].map((i) => {
		const c = parseInt(h.substr(i, 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2];
};

/** WCAG contrast ratio between two colours. */
export const cr = (a: string, b: string) => {
	const x = lum(a);
	const y = lum(b);
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** White or near-black, whichever reads better on colour c. */
export const on = (c: string) => (cr(c, WHITE) >= cr(c, INK) ? WHITE : INK);

export const darken = (h: string, t: number) =>
	"#" +
	[0, 2, 4]
		.map((i) =>
			Math.round(parseInt(hex(h).substr(i, 2), 16) * (1 - t))
				.toString(16)
				.padStart(2, "0"),
		)
		.join("");

/** Primary darkened in 8% steps until it passes 4.5:1 on white (link text). */
export const primaryInk = (P: string) => {
	let ink = P;
	for (let t = 0.08; cr(ink, WHITE) < 4.5 && t < 0.9; t += 0.08) ink = darken(P, t);
	return ink;
};

export type Palette = { P: string; A: string; L: string };

export function roleVars({ P, A, L }: Palette) {
	return {
		"--p": P,
		"--a": A,
		"--l": L,
		"--on-p": on(P),
		"--on-a": on(A),
		"--on-l": on(L),
		"--p-ink": primaryInk(P),
	};
}

export const styleString = (vars: Record<string, string>) =>
	Object.entries(vars)
		.map(([k, v]) => `${k}: ${v}`)
		.join("; ");
