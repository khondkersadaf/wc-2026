import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const STATUS_BADGE = {
  SCHEDULED: 'bg-gray-700 text-gray-300',
  TIMED: 'bg-gray-700 text-gray-300',
  IN_PLAY: 'bg-emerald-900 text-emerald-300 animate-pulse',
  PAUSED: 'bg-yellow-900 text-yellow-300',
  FINISHED: 'bg-gray-800 text-gray-400',
  POSTPONED: 'bg-red-900 text-red-300',
};

const STATUS_LABEL = {
  SCHEDULED: 'Upcoming',
  TIMED: 'Upcoming',
  IN_PLAY: 'Live',
  PAUSED: 'Half Time',
  FINISHED: 'FT',
  POSTPONED: 'Postponed',
};

function GoalList({ goals, side }) {
  const mine = goals.filter((g) => g.team === side);
  if (mine.length === 0) return null;
  return (
    <div className={`flex flex-col gap-0.5 mt-1 ${side === 'HOME' ? 'items-center' : 'items-center'}`}>
      {mine.map((g, i) => (
        <span key={i} className="text-xs text-gray-400 leading-tight">
          {g.isOwnGoal ? '(og) ' : g.isPenalty ? '(pen) ' : ''}
          {g.scorer} {g.minute}'
        </span>
      ))}
    </div>
  );
}

export default function MatchCard({ match }) {
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isFinished = match.status === 'FINISHED';
  const showScore = isLive || isFinished;
  const goals = match.goals ? JSON.parse(match.goals) : [];

  return (
    <Link
      to={`/fixtures/${match.id}`}
      className="block bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-600 transition-colors active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium">
          {match.matchGroup ? `${match.matchGroup.replace('GROUP_', 'Group ')} · ` : ''}
          {match.stage.replace(/_/g, ' ')}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[match.status] || 'bg-gray-700 text-gray-300'}`}>
          {STATUS_LABEL[match.status] || match.status}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1 flex flex-col items-center gap-1">
          {match.homeCrest && <img src={match.homeCrest} alt="" className="w-10 h-10 object-contain" />}
          <span className="text-sm font-semibold text-center leading-tight">{match.homeTeam}</span>
          {showScore && <GoalList goals={goals} side="HOME" />}
        </div>

        <div className="flex flex-col items-center min-w-[64px] pt-1">
          {showScore ? (
            <span className={`text-2xl font-bold tabular-nums ${isLive ? 'text-emerald-400' : 'text-white'}`}>
              {match.homeScore} – {match.awayScore}
            </span>
          ) : (
            <span className="text-lg font-bold text-amber-400">vs</span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          {match.awayCrest && <img src={match.awayCrest} alt="" className="w-10 h-10 object-contain" />}
          <span className="text-sm font-semibold text-center leading-tight">{match.awayTeam}</span>
          {showScore && <GoalList goals={goals} side="AWAY" />}
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-gray-500">
        {format(new Date(match.matchDate), 'EEE d MMM yyyy · HH:mm')}
        {match.venue && ` · ${match.venue}`}
      </div>
    </Link>
  );
}
