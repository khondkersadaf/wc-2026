import { NavLink } from 'react-router-dom';
import { Trophy, TicketIcon, CalendarDays, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();

  const links = [
    { to: '/fixtures', icon: CalendarDays, label: 'Fixtures' },
    { to: '/my-bets', icon: TicketIcon, label: 'My Bets' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    ...(user?.isAdmin ? [{ to: '/admin', icon: Settings, label: 'Admin' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-gray-900 border-t border-gray-800 safe-bottom z-50">
      <div className="flex">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-400' : 'text-gray-500'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
