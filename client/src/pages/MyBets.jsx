import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../lib/api';

const STATUS_STYLE = {
  WON: 'text-emerald-400 bg-emerald-900/40',
  LOST: 'text-red-400 bg-red-900/40',
  VOID: 'text-gray-400 bg-gray-800',
  PENDING: 'text-amber-400 bg-amber-900/40',
};

function formatPrediction(betType, prediction) {
  if (betType === 'MATCH_WINNER') {
    return { HOME_WIN: 'Home Win', DRAW: 'Draw', AWAY_WIN: 'Away Win' }[prediction] || prediction;
  }
  if (betType === 'CORRECT_SCORE') {
    try { const p = JSON.parse(prediction); return `${p.home} – ${p.away}`; } catch { return prediction; }
  }
  return prediction;
}

const TABS = ['ALL', 'PENDING', 'WON', 'LOST'];

export default function MyBets() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');

  useEffect(() => {
    api.get('/api/bets/mine')
      .then((r) => setBets(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'ALL' ? bets : bets.filter((b) => b.status === tab);

  const totalStaked = bets.filter((b) => b.status !== 'PENDING').reduce((s, b) => s + b.stake, 0);
  const totalPayout = bets.reduce((s, b) => s + (b.payout || 0), 0);
  const net = totalPayout - totalStaked;

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-5">My Bets</h1>

      {!loading && bets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Staked</div>
            <div className="text-lg font-bold">৳{totalStaked.toFixed(2)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Returned</div>
            <div className="text-lg font-bold">৳{totalPayout.toFixed(2)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Net P&L</div>
            <div className={`text-lg font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {net >= 0 ? '+' : ''}৳{net.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-4 bg-gray-900 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t ? 'bg-emerald-500 text-white' : 'text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-900 rounded-xl h-28 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <div className="text-4xl mb-3">🎰</div>
          <p className="font-medium">No bets yet</p>
          <p className="text-sm mt-1">Head to Fixtures to place your first bet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bet) => (
            <div key={bet.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  {bet.match && (
                    <p className="text-sm font-semibold">
                      {bet.match.homeTeam} vs {bet.match.awayTeam}
                    </p>
                  )}
                  {!bet.match && <p className="text-sm font-semibold">Tournament Bet</p>}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {bet.betType.replace(/_/g, ' ')} · {bet.match ? format(new Date(bet.match.matchDate), 'd MMM') : ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_STYLE[bet.status]}`}>
                  {bet.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500">Prediction: </span>
                  <span className="text-sm font-medium">{formatPrediction(bet.betType, bet.prediction)}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">৳{bet.stake} @ {bet.odds}x</span>
                  {bet.status === 'WON' && (
                    <p className="text-sm font-bold text-emerald-400">+৳{(bet.payout - bet.stake).toFixed(2)}</p>
                  )}
                  {bet.status === 'LOST' && (
                    <p className="text-sm font-bold text-red-400">-৳{bet.stake.toFixed(2)}</p>
                  )}
                  {bet.status === 'PENDING' && (
                    <p className="text-sm font-bold text-amber-400">Win ৳{(bet.stake * bet.odds).toFixed(2)}</p>
                  )}
                </div>
              </div>

              {bet.match?.status === 'FINISHED' && (
                <div className="mt-2 pt-2 border-t border-gray-800 text-xs text-gray-500">
                  Final: {bet.match.homeScore} – {bet.match.awayScore}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
