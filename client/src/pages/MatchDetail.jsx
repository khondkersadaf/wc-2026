import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const BET_TYPES = [
  { key: 'MATCH_WINNER', label: 'Match Winner', odds: 2.0, description: 'Pick who wins' },
  { key: 'CORRECT_SCORE', label: 'Correct Score', odds: 8.0, description: 'Exact scoreline' },
  { key: 'FIRST_GOALSCORER', label: 'First Goalscorer', odds: 10.0, description: 'Who scores first' },
];

const STATUS_LABEL = { SCHEDULED: 'Upcoming', TIMED: 'Upcoming', IN_PLAY: 'Live', PAUSED: 'Half Time', FINISHED: 'Full Time', POSTPONED: 'Postponed' };

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [betType, setBetType] = useState('MATCH_WINNER');
  const [prediction, setPrediction] = useState('HOME_WIN');
  const [scoreHome, setScoreHome] = useState('');
  const [scoreAway, setScoreAway] = useState('');
  const [scorer, setScorer] = useState('');
  const [stake, setStake] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/api/matches/${id}`).then((r) => setMatch(r.data)).catch(console.error);
  }, [id]);

  const canBet = match && (match.status === 'SCHEDULED' || match.status === 'TIMED');

  async function placeBet(e) {
    e.preventDefault();
    if (!stake || Number(stake) <= 0) return toast.error('Enter a valid stake');

    let pred;
    if (betType === 'MATCH_WINNER') pred = prediction;
    else if (betType === 'CORRECT_SCORE') {
      if (scoreHome === '' || scoreAway === '') return toast.error('Enter a score');
      pred = JSON.stringify({ home: Number(scoreHome), away: Number(scoreAway) });
    } else {
      if (!scorer.trim()) return toast.error('Enter a player name');
      pred = scorer.trim();
    }

    setSubmitting(true);
    try {
      await api.post('/api/bets', { matchId: match.id, betType, prediction: pred, stake: Number(stake) });
      toast.success('Bet placed!');
      setStake('');
      setScorer('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place bet');
    } finally {
      setSubmitting(false);
    }
  }

  if (!match) return (
    <div className="px-4 pt-6">
      <div className="bg-gray-900 rounded-xl h-48 animate-pulse" />
    </div>
  );

  const myBets = match.bets || [];
  const odds = BET_TYPES.find((b) => b.key === betType)?.odds || 2.0;

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 text-sm mb-4">
          <ChevronLeft size={18} /> Back
        </button>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500">
              {match.matchGroup?.replace('GROUP_', 'Group ') || ''} {match.stage.replace(/_/g, ' ')}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              match.status === 'IN_PLAY' ? 'bg-emerald-900 text-emerald-300' :
              match.status === 'FINISHED' ? 'bg-gray-800 text-gray-400' : 'bg-gray-700 text-gray-300'
            }`}>
              {STATUS_LABEL[match.status] || match.status}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              {match.homeCrest && <img src={match.homeCrest} alt="" className="w-14 h-14 object-contain" />}
              <span className="font-bold text-center">{match.homeTeam}</span>
            </div>
            <div className="flex flex-col items-center">
              {match.status === 'FINISHED' || match.status === 'IN_PLAY' || match.status === 'PAUSED' ? (
                <span className="text-3xl font-bold tabular-nums">{match.homeScore} – {match.awayScore}</span>
              ) : (
                <>
                  <span className="text-xl font-bold text-amber-400">vs</span>
                  <span className="text-sm text-gray-500 mt-1">{format(new Date(match.matchDate), 'HH:mm')}</span>
                </>
              )}
              <span className="text-xs text-gray-600 mt-1">{format(new Date(match.matchDate), 'd MMM yyyy')}</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              {match.awayCrest && <img src={match.awayCrest} alt="" className="w-14 h-14 object-contain" />}
              <span className="font-bold text-center">{match.awayTeam}</span>
            </div>
          </div>
        </div>

        {myBets.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Your bets on this match</h3>
            <div className="space-y-2">
              {myBets.map((b) => (
                <div key={b.id} className="bg-gray-900 rounded-xl border border-gray-800 p-3 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-medium text-gray-400">{b.betType.replace(/_/g, ' ')}</span>
                    <p className="text-sm font-semibold mt-0.5">{typeof b.prediction === 'string' && b.prediction.startsWith('{') ? JSON.stringify(JSON.parse(b.prediction)) : b.prediction}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">৳{b.stake}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      b.status === 'WON' ? 'bg-emerald-900 text-emerald-300' :
                      b.status === 'LOST' ? 'bg-red-900 text-red-300' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {b.status === 'WON' ? `+৳${b.payout?.toFixed(2)}` : b.status === 'LOST' ? `-৳${b.stake}` : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canBet && (
          <form onSubmit={placeBet}>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Place a bet</h3>

            <div className="flex gap-2 mb-4">
              {BET_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setBetType(t.key)}
                  className={`flex-1 py-2 px-1 rounded-lg text-xs font-semibold border transition-colors ${
                    betType === t.key ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-gray-700 text-gray-500'
                  }`}
                >
                  <div>{t.label}</div>
                  <div className="text-amber-400 mt-0.5">{t.odds}x</div>
                </button>
              ))}
            </div>

            {betType === 'MATCH_WINNER' && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { key: 'HOME_WIN', label: match.homeTeam },
                  { key: 'DRAW', label: 'Draw' },
                  { key: 'AWAY_WIN', label: match.awayTeam },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPrediction(key)}
                    className={`py-3 px-2 rounded-xl text-sm font-semibold border transition-colors ${
                      prediction === key ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-gray-700 bg-gray-900 text-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {betType === 'CORRECT_SCORE' && (
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scoreHome}
                  onChange={(e) => setScoreHome(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-center text-2xl font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-gray-500 font-bold text-xl">–</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scoreAway}
                  onChange={(e) => setScoreAway(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-center text-2xl font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {betType === 'FIRST_GOALSCORER' && (
              <input
                type="text"
                value={scorer}
                onChange={(e) => setScorer(e.target.value)}
                placeholder="Player name"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-emerald-500"
              />
            )}

            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">৳</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  placeholder="Stake"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-7 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-base"
                />
              </div>
              {stake > 0 && (
                <div className="text-right text-sm">
                  <div className="text-gray-500">Win</div>
                  <div className="font-bold text-emerald-400">৳{(Number(stake) * odds).toFixed(2)}</div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {submitting ? 'Placing...' : `Place Bet · ${odds}x odds`}
            </button>
          </form>
        )}

        {!canBet && match.status !== 'FINISHED' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center text-gray-400 text-sm">
            Bets are closed for this match
          </div>
        )}
      </div>
    </div>
  );
}
