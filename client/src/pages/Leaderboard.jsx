import { useState, useEffect } from 'react';
import { Trophy, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [settleup, setSettleup] = useState([]);
  const [tab, setTab] = useState('board');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/ledger/balances'),
      api.get('/api/ledger/settleup'),
    ]).then(([b, s]) => {
      setBalances(b.data);
      setSettleup(s.data.transactions);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <Trophy size={24} className="text-amber-400" />
      </div>

      <div className="flex gap-2 mb-5 bg-gray-900 rounded-xl p-1">
        {[{ key: 'board', label: 'Standings' }, { key: 'settle', label: 'Settle Up' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-emerald-500 text-white' : 'text-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-gray-900 rounded-xl h-20 animate-pulse" />)}</div>
      ) : tab === 'board' ? (
        <div className="space-y-3">
          {balances.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              <div className="text-4xl mb-3">🏆</div>
              <p>No bets settled yet</p>
            </div>
          )}
          {balances.map((entry, i) => {
            const isMe = entry.user.id === user?.id;
            return (
              <div
                key={entry.user.id}
                className={`bg-gray-900 rounded-xl border p-4 ${isMe ? 'border-emerald-700' : 'border-gray-800'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">{MEDALS[i] || `${i + 1}`}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{entry.user.name}</span>
                      {isMe && <span className="text-xs text-emerald-400 font-medium">(you)</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {entry.betsPlaced} bets · {entry.won}W / {entry.lost}L / {entry.pending} pending
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${entry.netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.netBalance >= 0 ? '+' : ''}£{entry.netBalance.toFixed(2)}
                    </div>
                    {entry.pendingStake > 0 && (
                      <div className="text-xs text-amber-400">£{entry.pendingStake.toFixed(2)} at risk</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {settleup.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">All square!</p>
              <p className="text-sm mt-1">No debts to settle</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">Minimum transactions to clear all debts:</p>
              <div className="space-y-3">
                {settleup.map((t, i) => (
                  <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <span className="font-semibold text-red-300">{t.from}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">pays</span>
                        <ArrowRight size={14} className="text-gray-600" />
                        <span className="font-semibold text-emerald-300">{t.to}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-white">£{t.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
