// pages/index.js
import { useEffect, useState } from 'react';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getDashboardStats } from '../lib/dashboard';

const STATS = [
  { key: 'patients', label: 'Patients' },
  { key: 'medicines', label: 'Medicines' },
  { key: 'hospitals', label: 'Hospitals' },
  { key: 'dispenses', label: 'Dispenses' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Dashboard</h1>

        {error && <p className="mb-6 text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          {STATS.map((stat) => (
            <Card key={stat.key} className="text-center">
              <p className="font-display text-2xl font-semibold text-ink">{stats ? stats[stat.key] : '—'}</p>
              <p className="text-xs text-muted mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button href="/patients" className="w-full sm:w-auto">Patients</Button>
          <Button variant="secondary" href="/catalog" className="w-full sm:w-auto">Medicines</Button>
          <Button variant="secondary" href="/hospitals" className="w-full sm:w-auto">Hospitals</Button>
        </div>
      </main>
    </div>
  );
}
