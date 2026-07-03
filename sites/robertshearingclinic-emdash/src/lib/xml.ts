export function escapeXml(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function xmlResponse(body: string): Response {
	return new Response(body, {
		headers: {
			"content-type": "application/xml; charset=utf-8",
		},
	});
}
