const BASE_URL = 'https://api.football-data.org/v4';

// Track remaining quota from response headers to avoid hitting the rate limiter
let requestsAvailableThisMinute = 10;
let throttleUntil = null;

function headers() {
  return { 'X-Auth-Token': process.env.FOOTBALL_API_KEY };
}

function readRateLimitHeaders(res) {
  const available = res.headers.get('X-Requests-Available-Minute');
  const resetAt = res.headers.get('X-RequestCounter-Reset');

  if (available !== null) {
    requestsAvailableThisMinute = Number(available);
  }

  if (resetAt !== null) {
    throttleUntil = new Date(resetAt);
  }

  if (requestsAvailableThisMinute <= 1) {
    const resetMs = throttleUntil ? throttleUntil.getTime() - Date.now() : 60_000;
    const waitMs = Math.max(resetMs, 0) + 500;
    console.warn(`[footballApi] Rate limit close — pausing new requests for ${Math.ceil(waitMs / 1000)}s`);
    throttleUntil = new Date(Date.now() + waitMs);
  }
}

async function guardedFetch(url) {
  if (throttleUntil && Date.now() < throttleUntil.getTime()) {
    const waitMs = throttleUntil.getTime() - Date.now();
    console.log(`[footballApi] Throttled — waiting ${Math.ceil(waitMs / 1000)}s before next request`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const res = await fetch(url, { headers: headers() });
  readRateLimitHeaders(res);

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') || 60);
    throttleUntil = new Date(Date.now() + retryAfter * 1000);
    throw new Error(`Rate limited by API — retry after ${retryAfter}s`);
  }

  if (!res.ok) throw new Error(`Football API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchWorldCupMatches() {
  const data = await guardedFetch(`${BASE_URL}/competitions/WC/matches`);
  return data.matches || [];
}

export function normalizeMatch(m) {
  const scoreData = m.score?.fullTime;
  const winner = m.score?.winner;
  return {
    externalId: String(m.id),
    homeTeam: m.homeTeam?.name || m.homeTeam?.shortName || 'TBD',
    awayTeam: m.awayTeam?.name || m.awayTeam?.shortName || 'TBD',
    homeCrest: m.homeTeam?.crest || null,
    awayCrest: m.awayTeam?.crest || null,
    stage: m.stage || 'UNKNOWN',
    matchGroup: m.group || null,
    matchDate: new Date(m.utcDate),
    status: m.status,
    homeScore: scoreData?.home ?? null,
    awayScore: scoreData?.away ?? null,
    venue: m.venue || null,
    winner: winner || null,
    syncedAt: new Date(),
  };
}
