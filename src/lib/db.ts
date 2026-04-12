/**
 * D1 query helpers for practices_search, reviews, and providers tables.
 * These query the raw D1 tables (not emdash collections).
 *
 * Usage in Astro pages:
 *   const db = getDB(Astro.locals);
 *   const practices = await db.getPracticesByState("california");
 */

import { env } from "cloudflare:workers";

type D1Database = {
	prepare(sql: string): D1PreparedStatement;
};

type D1PreparedStatement = {
	bind(...values: any[]): D1PreparedStatement;
	all<T = any>(): Promise<{ results: T[] }>;
	first<T = any>(): Promise<T | null>;
	run(): Promise<any>;
};

export function getDB(_locals?: any): DbHelper {
	const db = env.DB as unknown as D1Database;
	if (!db) throw new Error("D1 binding 'DB' not found in cloudflare:workers env");
	return new DbHelper(db);
}

export class DbHelper {
	public db: D1Database;
	constructor(db: D1Database) { this.db = db; }

	// ── Practices ────────────────────────────────────────────────

	async getPracticesByState(stateSlug: string, limit = 50, offset = 0) {
		const { results } = await this.db
			.prepare(
				`SELECT * FROM practices_search WHERE state_slug = ? AND is_active = 1 ORDER BY rating DESC, reviews_count DESC LIMIT ? OFFSET ?`,
			)
			.bind(stateSlug, limit, offset)
			.all();
		return results;
	}

	async getPracticesByCity(stateSlug: string, citySlug: string, limit = 50, offset = 0) {
		const { results } = await this.db
			.prepare(
				`SELECT * FROM practices_search WHERE state_slug = ? AND city_slug = ? AND is_active = 1 ORDER BY rating DESC, reviews_count DESC LIMIT ? OFFSET ?`,
			)
			.bind(stateSlug, citySlug, limit, offset)
			.all();
		return results;
	}

	async countPracticesByState(stateSlug: string) {
		const row = await this.db
			.prepare(`SELECT COUNT(*) as count FROM practices_search WHERE state_slug = ? AND is_active = 1`)
			.bind(stateSlug)
			.first<{ count: number }>();
		return row?.count || 0;
	}

	async countPracticesByCity(stateSlug: string, citySlug: string) {
		const row = await this.db
			.prepare(`SELECT COUNT(*) as count FROM practices_search WHERE state_slug = ? AND city_slug = ? AND is_active = 1`)
			.bind(stateSlug, citySlug)
			.first<{ count: number }>();
		return row?.count || 0;
	}

	async countSearchResults(opts: { q?: string; specialization?: string }) {
		const conditions = ["is_active = 1"];
		const binds: any[] = [];
		if (opts.q) {
			const like = `%${opts.q}%`;
			conditions.push("(name LIKE ? OR city LIKE ? OR state_name LIKE ? OR zip LIKE ? OR address LIKE ?)");
			binds.push(like, like, like, like, like);
		}
		if (opts.specialization) {
			conditions.push("specializations LIKE ?");
			binds.push(`%${opts.specialization}%`);
		}
		const sql = `SELECT COUNT(*) as count FROM practices_search WHERE ${conditions.join(" AND ")}`;
		const row = await this.db.prepare(sql).bind(...binds).first<{ count: number }>();
		return row?.count || 0;
	}

	async getPracticeBySlug(slug: string) {
		return this.db
			.prepare(`SELECT * FROM practices_search WHERE practice_slug = ? AND is_active = 1`)
			.bind(slug)
			.first();
	}

	async getPracticeByHhId(hhId: number) {
		return this.db
			.prepare(`SELECT * FROM practices_search WHERE hh_id = ? AND is_active = 1`)
			.bind(hhId)
			.first();
	}

	// ── State/City aggregations ──────────────────────────────────

	async getStateCounts() {
		const { results } = await this.db
			.prepare(
				`SELECT state_slug, state_name, state_code, COUNT(*) as count FROM practices_search WHERE is_active = 1 GROUP BY state_slug ORDER BY count DESC`,
			)
			.all();
		return results as { state_slug: string; state_name: string; state_code: string; count: number }[];
	}

	async getCityCounts(stateSlug: string) {
		const { results } = await this.db
			.prepare(
				`SELECT city_slug, city, COUNT(*) as count FROM practices_search WHERE state_slug = ? AND is_active = 1 GROUP BY city_slug ORDER BY count DESC`,
			)
			.bind(stateSlug)
			.all();
		return results as { city_slug: string; city: string; count: number }[];
	}

	async getStateInfo(stateSlug: string) {
		return this.db
			.prepare(
				`SELECT state_slug, state_name, state_code, COUNT(*) as count FROM practices_search WHERE state_slug = ? AND is_active = 1 GROUP BY state_slug`,
			)
			.bind(stateSlug)
			.first() as Promise<{ state_slug: string; state_name: string; state_code: string; count: number } | null>;
	}

	async getCityInfo(stateSlug: string, citySlug: string) {
		return this.db
			.prepare(
				`SELECT city_slug, city, state_slug, state_name, state_code, COUNT(*) as count FROM practices_search WHERE state_slug = ? AND city_slug = ? AND is_active = 1 GROUP BY city_slug`,
			)
			.bind(stateSlug, citySlug)
			.first() as Promise<{ city_slug: string; city: string; state_slug: string; state_name: string; state_code: string; count: number } | null>;
	}

	// ── Search ───────────────────────────────────────────────────

	async searchPractices(query: string, limit = 20) {
		const like = `%${query}%`;
		const { results } = await this.db
			.prepare(
				`SELECT * FROM practices_search WHERE is_active = 1 AND (name LIKE ? OR city LIKE ? OR state_name LIKE ? OR zip LIKE ? OR specializations LIKE ? OR hearing_aid_brands LIKE ? OR insurance_plans LIKE ?) ORDER BY rating DESC, reviews_count DESC LIMIT ?`,
			)
			.bind(like, like, like, like, like, like, like, limit)
			.all();
		return results;
	}

	async searchPracticesAdvanced(opts: { q?: string; specialization?: string; limit?: number; offset?: number }) {
		const conditions = ["is_active = 1"];
		const binds: any[] = [];

		if (opts.q) {
			const like = `%${opts.q}%`;
			conditions.push("(name LIKE ? OR city LIKE ? OR state_name LIKE ? OR zip LIKE ? OR address LIKE ?)");
			binds.push(like, like, like, like, like);
		}

		if (opts.specialization) {
			conditions.push("specializations LIKE ?");
			binds.push(`%${opts.specialization}%`);
		}

		const limit = opts.limit || 20;
		const offset = opts.offset || 0;
		binds.push(limit, offset);

		const sql = `SELECT * FROM practices_search WHERE ${conditions.join(" AND ")} ORDER BY rating DESC, reviews_count DESC LIMIT ? OFFSET ?`;
		const { results } = await this.db.prepare(sql).bind(...binds).all();
		return results;
	}

	// ── Providers ────────────────────────────────────────────────

	async getProvidersByHhId(hhId: number) {
		const { results } = await this.db
			.prepare(`SELECT * FROM providers WHERE hh_id = ?`)
			.bind(hhId)
			.all();
		return results as { id: number; hh_id: number; name: string; credential: string; title: string }[];
	}

	// ── Reviews ──────────────────────────────────────────────────

	async getReviewsByHhId(hhId: number, limit = 5) {
		const { results } = await this.db
			.prepare(
				`SELECT * FROM reviews WHERE hh_id = ? ORDER BY published_at DESC LIMIT ?`,
			)
			.bind(hhId, limit)
			.all();
		return results as { id: number; hh_id: number; stars: number; text: string; published_at: string }[];
	}

	// ── Global stats ─────────────────────────────────────────────

	async getTotalCounts() {
		const practice = await this.db
			.prepare(`SELECT COUNT(*) as count FROM practices_search WHERE is_active = 1`)
			.first<{ count: number }>();
		const review = await this.db
			.prepare(`SELECT COUNT(*) as count FROM reviews`)
			.first<{ count: number }>();
		const states = await this.db
			.prepare(
				`SELECT COUNT(DISTINCT state_slug) as count FROM practices_search WHERE is_active = 1`,
			)
			.first<{ count: number }>();
		return {
			practices: practice?.count || 0,
			reviews: review?.count || 0,
			states: states?.count || 0,
		};
	}
}
