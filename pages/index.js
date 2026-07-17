// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { findPatientByMobile, createPatient } from '../lib/patients';

export default function Home() {
  const [mobile, setMobile] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const patient = await findPatientByMobile(mobile.trim());
      if (patient) {
        router.push(`/patient/${patient.mobile}`);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const patient = await createPatient({ mobile: mobile.trim(), name: name.trim() });
      router.push(`/patient/${patient.mobile}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Find a patient</h1>
        <Card>
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              type="tel"
              mono
              placeholder="Patient mobile number"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setNotFound(false);
                setName('');
              }}
              disabled={loading}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {notFound && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 text-sm text-muted">No patient with this number yet — register them below.</p>
              <div className="flex gap-3">
                <Input placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Button variant="secondary" onClick={handleRegister} disabled={loading}>
                  Register
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
