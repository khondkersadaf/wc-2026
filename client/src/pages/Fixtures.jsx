import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import api from '../lib/api';
import MatchCard from '../components/MatchCard';

const TABS = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['SCHEDULED', 'TIMED'] },
  { key: 'live', label: 'Live', statuses: ['IN_PLAY', 'PAUSED'] },
  { key: 'finished', label: 'Finished', statuses: ['FINISHED'] },
];

function dateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE d MMMM');
}

export default function Fixtures() {
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState('live');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/api/matches')
      .then((r) => setMatches(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabStatuses = TABS.find((t) => t.key === tab)?.statuses || [];
  const filtered = matches
    .filter((m) => tabStatuses.includes(m.status))
    .sort((a, b) => {
      const diff = new Date(a.matchDate) - new Date(b.matchDate);
      return tab === 'finished' ? -diff : diff;
    });

  // Group by date
  const grouped = filtered.reduce((acc, m) => {
    const key = format(new Date(m.matchDate), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const liveCount = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Fixtures</h1>
        <span className="text-2xl">🏆</span>
      </div>

      <div className="flex gap-2 mb-5 bg-gray-900 rounded-xl p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative ${
              tab === key ? 'bg-emerald-500 text-white' : 'text-gray-400'
            }`}
          >
            {label}
            {key === 'live' && liveCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">
                {liveCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <div className="text-4xl mb-3">
            {tab === 'live' ? '📺' : tab === 'upcoming' ? '📅' : '📋'}
          </div>
          <p className="font-medium">No {tab} matches</p>
          {tab === 'live' && <p className="text-sm mt-1">Check back when a game is on</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => tab === 'finished' ? b.localeCompare(a) : a.localeCompare(b)).map(([dateKey, dayMatches]) => (
            <div key={dateKey}>
              <h2 className="text-sm font-semibold text-gray-400 mb-2 ml-1">
                {dateLabel(dayMatches[0].matchDate)}
              </h2>
              <div className="space-y-3">
                {dayMatches.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
