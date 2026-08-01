// components/ui/TopNav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useHospital } from '../../utils/HospitalContext';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/patients', label: 'Patients' },
  { href: '/catalog', label: 'Medicines' },
  { href: '/hospitals', label: 'Hospitals' },
];

export default function TopNav() {
  const router = useRouter();
  const { hospitals, currentHospitalId, setCurrentHospitalId, loading, error } = useHospital();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 bg-ink px-4 sm:px-6">
      <div className="flex items-center gap-6 min-w-0">
        <Link href="/" className="font-display text-lg font-semibold text-paper shrink-0">
          Medico Kadapa
        </Link>
        <nav className="hidden sm:flex items-center gap-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${
                router.pathname === link.href ? 'text-paper font-medium' : 'text-paper/70 hover:text-paper'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <select
          value={currentHospitalId ?? ''}
          onChange={(e) => setCurrentHospitalId(e.target.value)}
          disabled={loading || hospitals.length === 0}
          className="rounded-control border border-paper/30 bg-ink px-3 py-1 text-sm text-paper shrink-0 max-w-[160px] sm:max-w-none"
        >
          {hospitals.length === 0 && <option value="">No hospitals</option>}
          {hospitals.map((h) => (
            <option key={h.id} value={h.id} className="text-ink">
              {h.name}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </header>
  );
}
