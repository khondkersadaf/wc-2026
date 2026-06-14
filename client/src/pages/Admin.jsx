import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, CheckCircle, Plus, Trash2, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { logout } = useAuth();
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingBets, setPendingBets] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState('matches');
  const [newUser, setNewUser] = useState({ name: '', pin: '', isAdmin: false });
  const [adding, setAdding] = useState(false);

  async function loadData() {
    const [m, u, b] = await Promise.all([
      api.get('/api/matches'),
      api.get('/api/auth/users'),
      api.get('/api/bets'),
    ]);
    setMatches(m.data);
    setUsers(u.data);
    setPendingBets(b.data.filter((b) => b.status === 'PENDING' && b.match?.status === 'FINISHED'));
  }

  useEffect(() => { loadData(); }, []);

  async function syncMatches() {
    setSyncing(true);
    try {
      const { data } = await api.post('/api/matches/sync');
      toast.success(`Synced: ${data.created} new, ${data.updated} updated`);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function settleMatch(matchId) {
    try {
      const { data } = await api.post(`/api/bets/settle/${matchId}`);
      toast.success(`Settled ${data.settled} bets`);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to settle');
    }
  }

  async function manualSettle(betId, status) {
    try {
      await api.patch(`/api/bets/${betId}/settle-manual`, { status });
      toast.success(`Bet marked as ${status}`);
      await loadData();
    } catch (err) {
      toast.error('Failed');
    }
  }

  async function addUser(e) {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.pin.trim()) return;
    setAdding(true);
    try {
      await api.post('/api/auth/users', newUser);
      toast.success(`User "${newUser.name}" created`);
      setNewUser({ name: '', pin: '', isAdmin: false });
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setAdding(false);
    }
  }

  async function deleteUser(id, name) {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      await api.delete(`/api/auth/users/${id}`);
      toast.success('User removed');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  const finishedUnsettled = matches.filter(
    (m) => m.status === 'FINISHED' && pendingBets.some((b) => b.match?.id === m.id)
  );

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Admin</h1>
        <button onClick={logout} className="text-sm text-gray-500 underline">Log out</button>
      </div>

      <div className="flex gap-1.5 mb-5 bg-gray-900 rounded-xl p-1">
        {['matches', 'settle', 'users'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-emerald-500 text-white' : 'text-gray-400'}`}
          >
            {t === 'settle' ? `Settle (${pendingBets.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'matches' && (
        <div>
          <button
            onClick={syncMatches}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl mb-4 transition-colors"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing from API...' : 'Sync Fixtures from API'}
          </button>
          <p className="text-xs text-gray-600 text-center mb-4">Requires FOOTBALL_API_KEY in .env</p>
          <div className="space-y-2">
            {matches.slice(0, 20).map((m) => (
              <div key={m.id} className="bg-gray-900 rounded-xl border border-gray-800 p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{m.homeTeam} vs {m.awayTeam}</p>
                  <p className="text-xs text-gray-500">{format(new Date(m.matchDate), 'd MMM HH:mm')} · {m.status}</p>
                </div>
                {(m.homeScore !== null) && (
                  <span className="text-sm font-bold">{m.homeScore}–{m.awayScore}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settle' && (
        <div>
          {pendingBets.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-600" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No unsettled bets on finished matches</p>
            </div>
          ) : (
            <div className="space-y-4">
              {finishedUnsettled.map((match) => {
                const matchBets = pendingBets.filter((b) => b.match?.id === match.id);
                return (
                  <div key={match.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{match.homeTeam} {match.homeScore}–{match.awayScore} {match.awayTeam}</p>
                        <p className="text-xs text-gray-500">{matchBets.length} pending bets</p>
                      </div>
                      <button
                        onClick={() => settleMatch(match.id)}
                        className="bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                      >
                        Auto Settle
                      </button>
                    </div>
                    <div className="space-y-2">
                      {matchBets.map((bet) => (
                        <div key={bet.id} className="bg-gray-800 rounded-lg p-2.5 flex items-center justify-between">
                          <div>
                            <span className="text-sm">{bet.user.name} · {bet.betType.replace(/_/g, ' ')}</span>
                            <p className="text-xs text-gray-400">{bet.prediction} · £{bet.stake}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => manualSettle(bet.id, 'WON')} className="text-xs bg-emerald-900 text-emerald-300 px-2 py-1 rounded">Won</button>
                            <button onClick={() => manualSettle(bet.id, 'LOST')} className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded">Lost</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <form onSubmit={addUser} className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-300">Add New User</h3>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              inputMode="numeric"
              value={newUser.pin}
              onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
              placeholder="PIN (4-8 digits)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={newUser.isAdmin}
                onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                className="rounded"
              />
              Admin
            </label>
            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm"
            >
              <Plus size={16} /> Add User
            </button>
          </form>

          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-gray-900 rounded-xl border border-gray-800 p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{u.name}</span>
                  {u.isAdmin && <span className="ml-2 text-xs text-amber-400 font-medium">Admin</span>}
                </div>
                <button onClick={() => deleteUser(u.id, u.name)} className="text-red-500 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
