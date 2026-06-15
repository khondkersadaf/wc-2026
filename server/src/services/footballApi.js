const BASE_URL = 'https://api.football-data.org/v4';

let requestsAvailableThisMinute = 10;
let throttleUntil = null;

function readRateLimitHeaders(res) {
  const available = res.headers.get('X-Requests-Available-Minute');
  const resetAt = res.headers.get('X-RequestCounter-Reset');
  if (available !== null) requestsAvailableThisMinute = Number(available);
  if (resetAt !== null) throttleUntil = new Date(resetAt);
  if (requestsAvailableThisMinute <= 1) {
    const resetMs = throttleUntil ? throttleUntil.getTime() - Date.now() : 60_000;
    throttleUntil = new Date(Date.now() + Math.max(resetMs, 0) + 500);
  }
}

async function guardedFetch(url) {
  if (throttleUntil && Date.now() < throttleUntil.getTime()) {
    const waitMs = throttleUntil.getTime() - Date.now();
    await new Promise((r) => setTimeout(r, waitMs));
  }
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
  });
  readRateLimitHeaders(res);
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') || 60);
    throttleUntil = new Date(Date.now() + retryAfter * 1000);
    throw new Error(`Rate limited — retry after ${retryAfter}s`);
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

  // Extract goal scorers from football-data.org v4 response
  let goals = null;
  if (Array.isArray(m.goals) && m.goals.length > 0) {
    goals = m.goals.map((g) => ({
      scorer: g.scorer?.name || 'Unknown',
      minute: g.minute + (g.injuryTime || 0),
      team: g.team?.name === m.homeTeam?.name ? 'HOME' : 'AWAY',
      isPenalty: g.type === 'PENALTY',
      isOwnGoal: g.type === 'OWN',
    }));
  }

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
    goals,
    syncedAt: new Date(),
  };
}
