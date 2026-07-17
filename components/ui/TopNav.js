// components/ui/TopNav.js
import { useAuth } from '../../utils/AuthContext';

export default function TopNav() {
  const { staffProfile, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-ink px-4 sm:px-6">
      <span className="font-display text-lg font-semibold text-paper">Medico Kadapa</span>
      <div className="flex items-center gap-3 text-sm text-paper/80">
        {staffProfile && (
          <span>
            {staffProfile.full_name} · {staffProfile.hospitals?.name}
          </span>
        )}
        <button
          onClick={logout}
          className="rounded-control border border-paper/30 px-3 py-1 text-paper hover:bg-paper/10"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
