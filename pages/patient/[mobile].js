// pages/patient/[mobile].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DosageTimingPicker from '../../components/ui/DosageTimingPicker';
import { findPatientByMobile } from '../../lib/patients';
import { getDispenseHistory } from '../../lib/dispenses';
import { getPatientReports } from '../../lib/reports';

export default function PatientProfile() {
  const router = useRouter();
  const { mobile } = router.query;
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mobile) return;
    (async () => {
      setLoading(true);
      const p = await findPatientByMobile(mobile);
      setPatient(p);
      if (p) {
        const [h, r] = await Promise.all([getDispenseHistory(p.id), getPatientReports(p.id)]);
        setHistory(h);
        setReports(r);
      }
      setLoading(false);
    })();
  }, [mobile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        <p className="p-8 text-muted">Loading…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        <p className="p-8 text-muted">No patient found for {mobile}.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Card className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{patient.name || 'Unnamed patient'}</p>
            <p className="font-mono text-sm text-muted">{patient.mobile}</p>
          </div>
          <div className="flex gap-3">
            <Button href={`/dispense/new?patient=${patient.mobile}`}>Dispense medicine</Button>
            <Button variant="secondary" href={`/reports/new?patient=${patient.mobile}`}>
              Attach report
            </Button>
          </div>
        </Card>

        <h2 className="font-display text-lg font-semibold text-ink mb-3">Medicine history</h2>
        {history.length === 0 && <p className="text-sm text-muted mb-8">No medicines dispensed yet.</p>}
        <div className="space-y-3 mb-8">
          {history.map((d) => (
            <Card key={d.id}>
              <p className="text-xs text-muted mb-2">
                {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {d.hospitals?.name ? ` · ${d.hospitals.name}` : ''}
              </p>
              <div className="space-y-3">
                {d.dispense_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.medicines.image_url ? (
                      <img
                        src={item.medicines.image_url}
                        alt={item.medicines.name}
                        className="h-12 w-12 rounded-control object-cover border border-line"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-control border border-line bg-paper" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-ink">{item.medicines.name}</p>
                      <p className="text-xs text-muted">
                        {item.quantity} · {item.food_instruction === 'before_food' ? 'Before food' : 'After food'} ·{' '}
                        {item.duration_days} days
                      </p>
                    </div>
                    <DosageTimingPicker value={item.timing} readOnly />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <h2 className="font-display text-lg font-semibold text-ink mb-3">Reports & scans</h2>
        {reports.length === 0 && <p className="text-sm text-muted">No reports attached yet.</p>}
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{r.label || 'Untitled report'}</p>
                <p className="text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                  {r.uploaded_by === 'hospital' ? 'Added by hospital' : 'Added by patient'}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
