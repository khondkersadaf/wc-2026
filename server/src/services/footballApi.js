const BASE_URL = 'https://v3.football.api-sports.io';
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

const LIVE_STATUSES = ['1H', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY },
  });
  if (res.status === 429) throw new Error('Rate limit exceeded — 100 requests/day on free tier');
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`);
  }
  return data.response;
}

function mapStatus(short) {
  if (LIVE_STATUSES.includes(short)) return 'IN_PLAY';
  if (short === 'HT') return 'PAUSED';
  if (FINISHED_STATUSES.includes(short)) return 'FINISHED';
  if (['PST', 'CANC', 'ABD'].includes(short)) return 'POSTPONED';
  if (short === 'TBD') return 'TIMED';
  return 'SCHEDULED';
}

function mapWinner(f) {
  if (f.teams.home.winner === true) return f.teams.home.name;
  if (f.teams.away.winner === true) return f.teams.away.name;
  const status = mapStatus(f.fixture.status.short);
  if (status === 'FINISHED' && f.goals.home !== null && f.goals.away !== null) {
    if (f.goals.home === f.goals.away) return 'DRAW';
  }
  return null;
}

export async function fetchWorldCupMatches() {
  return apiFetch(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`);
}

export function normalizeMatch(f) {
  const round = f.league.round || 'Unknown';
  return {
    externalId: String(f.fixture.id),
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    homeCrest: f.teams.home.logo || null,
    awayCrest: f.teams.away.logo || null,
    stage: round,
    matchGroup: round.toLowerCase().includes('group') ? round : null,
    matchDate: new Date(f.fixture.date),
    status: mapStatus(f.fixture.status.short),
    homeScore: f.goals.home ?? null,
    awayScore: f.goals.away ?? null,
    venue: f.fixture.venue?.name || null,
    winner: mapWinner(f),
    syncedAt: new Date(),
  };
}

export async function fetchGoalsForFixture(externalId, homeTeam, awayTeam) {
  const events = await apiFetch(`/fixtures/events?fixture=${externalId}&type=Goal`);

  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const homeNorm = norm(homeTeam);

  return events.map((e) => {
    const teamNorm = norm(e.team.name);
    const side = teamNorm === homeNorm || homeNorm.includes(teamNorm) || teamNorm.includes(homeNorm)
      ? 'HOME'
      : 'AWAY';
    return {
      scorer: e.player.name,
      minute: e.time.elapsed + (e.time.extra || 0),
      team: side,
      isPenalty: e.detail === 'Penalty',
      isOwnGoal: e.detail === 'Own Goal',
    };
  });
}
