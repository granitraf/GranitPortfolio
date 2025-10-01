import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';
const BASE = 'https://finnhub.io/api/v1';

// Simple in-memory cache
const cache: Record<string, { data: any; ts: number }> = {};
const TTL_MS = 60_000; // 60s

function getCache(key: string) {
	const c = cache[key];
	if (!c) return null;
	if (Date.now() - c.ts > TTL_MS) return null;
	return c.data;
}
function setCache(key: string, data: any) {
	cache[key] = { data, ts: Date.now() };
}

async function fetchQuote(symbol: string) {
	const url = `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
	const res = await fetch(url, { cache: 'no-store' });
	if (!res.ok) throw new Error(`quote ${symbol} ${res.status}`);
	return res.json();
}

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const symbols = (searchParams.get('symbols') || '').split(',').map(s => s.trim()).filter(Boolean);
		if (!symbols.length) {
			return NextResponse.json({ ok: false, error: 'symbols required' }, { status: 400 });
		}

		const key = `quotes:${symbols.sort().join(',')}`;
		const cached = getCache(key);
		if (cached) {
			return NextResponse.json({ ok: true, data: cached, cached: true });
		}

		const results: Record<string, any> = {};
		// Batch concurrently but tolerate failures; keep partials
		await Promise.all(symbols.map(async (s) => {
			try {
				const q = await fetchQuote(s);
				results[s] = q;
			} catch (e) {
				// leave undefined; caller can use previous value
			}
		}));

		// Only set cache if we got at least one success
		const haveAny = Object.keys(results).length > 0;
		if (haveAny) setCache(key, results);
		// If no successes, try last-good for each symbol
		if (!haveAny) {
			const last: Record<string, any> = {};
			for (const s of symbols) {
				const c = getCache(`quotes:${s}`); // optional per-symbol fallback
				if (c) last[s] = c;
			}
			return NextResponse.json({ ok: true, data: last, cached: true });
		}

		// Also set individual symbol caches for granular fallback
		for (const s of Object.keys(results)) setCache(`quotes:${s}`, results[s]);

		return NextResponse.json({ ok: true, data: results, cached: false });
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message ?? 'failed' }, { status: 500 });
	}
}
