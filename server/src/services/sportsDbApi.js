const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

function normalize(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function nameMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function getEventsOnDate(date) {
  const res = await fetch(`${BASE}/eventsday.php?d=${date}&s=Soccer`);
  const data = await res.json();
  return (data.events || []).filter((e) => e.strLeague === 'FIFA World Cup');
}

async function getGoalsForEvent(eventId) {
  const res = await fetch(`${BASE}/lookuptimeline.php?id=${eventId}`);
  const data = await res.json();
  return (data.timeline || []).filter((e) => e.strTimeline === 'Goal');
}

export async function fetchGoalsForMatch(homeTeam, awayTeam, matchDate) {
  const dateStr = new Date(matchDate).toISOString().slice(0, 10);
  const events = await getEventsOnDate(dateStr);

  const event = events.find(
    (e) =>
      (nameMatch(e.strHomeTeam, homeTeam) && nameMatch(e.strAwayTeam, awayTeam)) ||
      (nameMatch(e.strHomeTeam, awayTeam) && nameMatch(e.strAwayTeam, homeTeam))
  );

  if (!event) return null;

  const rawGoals = await getGoalsForEvent(event.idEvent);

  // Detect if teams are swapped (TheSportsDB might list them differently)
  const swapped = nameMatch(event.strHomeTeam, awayTeam);

  return rawGoals.map((g) => ({
    scorer: g.strPlayer,
    minute: Number(g.intTime),
    // TheSportsDB "strHome: Yes" means goal by the home team in their listing
    team: (g.strHome === 'Yes') === !swapped ? 'HOME' : 'AWAY',
    isPenalty: g.strTimelineDetail?.includes('Penalty') || false,
    isOwnGoal: g.strTimelineDetail?.includes('Own') || false,
  }));
}

export async function fetchGoalsForAllFinished(matches) {
  const results = [];
  for (const match of matches) {
    try {
      const goals = await fetchGoalsForMatch(match.homeTeam, match.awayTeam, match.matchDate);
      results.push({ matchId: match.id, goals });
    } catch (err) {
      results.push({ matchId: match.id, goals: null, error: err.message });
    }
    // Respect TheSportsDB rate limits - short pause between requests
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}
