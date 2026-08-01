// pages/patients/index.js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { findPatientByMobile, createPatient, listPatients } from '../../lib/patients';

export default function Patients() {
  const [mobile, setMobile] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [listError, setListError] = useState('');
  const router = useRouter();
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    listPatients({ query })
      .then((data) => {
        if (requestIdRef.current === requestId) {
          setListError('');
          setPatients(data);
        }
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          setListError(err.message);
        }
      });
  }, [query]);

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
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Find or register a patient</h1>
        <Card className="mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="tel"
              mono
              placeholder="Patient mobile number"
              className="flex-1"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setNotFound(false);
                setName('');
              }}
              disabled={loading}
              required
            />
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {notFound && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 text-sm text-muted">No patient with this number yet — register them below.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input placeholder="Patient name" className="flex-1" value={name} onChange={(e) => setName(e.target.value)} required />
                <Button variant="secondary" onClick={handleRegister} disabled={loading} className="w-full sm:w-auto">
                  Register
                </Button>
              </div>
            </div>
          )}
        </Card>

        <h2 className="font-display text-lg font-semibold text-ink mb-3">All patients</h2>
        <Input placeholder="Filter by name or mobile" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-4" />
        {listError && <p className="mb-4 text-sm text-danger">{listError}</p>}
        <div className="space-y-2">
          {patients.map((p) => (
            <Card key={p.id}>
              <button
                type="button"
                onClick={() => router.push(`/patient/${p.mobile}`)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="font-medium text-ink">{p.name || 'Unnamed patient'}</p>
                  <p className="font-mono text-xs text-muted">{p.mobile}</p>
                </div>
              </button>
            </Card>
          ))}
          {patients.length === 0 && !listError && <p className="text-sm text-muted">No patients yet.</p>}
        </div>
      </main>
    </div>
  );
}
