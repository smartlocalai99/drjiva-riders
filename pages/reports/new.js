// pages/reports/new.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { findPatientByMobile } from '../../lib/patients';
import { uploadPatientReport } from '../../lib/reports';
import { useHospital } from '../../utils/HospitalContext';

export default function NewReport() {
  const router = useRouter();
  const { patient: mobile } = router.query;
  const { currentHospital } = useHospital();

  const [patient, setPatient] = useState(null);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mobile) return;
    findPatientByMobile(mobile)
      .then(setPatient)
      .catch((err) => setError(err.message));
  }, [mobile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!currentHospital) {
      setError('Pick a hospital from the top bar first.');
      return;
    }
    if (!file) {
      setError('Choose a photo or PDF to attach.');
      return;
    }
    setSaving(true);
    try {
      await uploadPatientReport({
        patientId: patient.id,
        hospitalId: currentHospital.id,
        staffId: null,
        label: label.trim(),
        file,
      });
      router.push(`/patient/${patient.mobile}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        {error ? <p className="p-8 text-danger">{error}</p> : <p className="p-8 text-muted">Loading patient…</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <Card className="mb-6">
          <p className="font-display text-xl font-semibold text-ink">{patient.name || 'Unnamed patient'}</p>
          <p className="font-mono text-sm text-muted">{patient.mobile}</p>
        </Card>

        <h1 className="font-display text-lg font-semibold text-ink mb-3">Attach OP report or scan</h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Label, e.g. OP visit 17 Jul" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Uploading…' : 'Attach report'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
