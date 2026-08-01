// pages/hospitals/index.js
import { useEffect, useState } from 'react';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { listHospitals, createHospital, updateHospital } from '../../lib/hospitals';

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const refresh = () => {
    listHospitals()
      .then((data) => {
        setListError('');
        setHospitals(data);
      })
      .catch((err) => setListError(err.message));
  };

  useEffect(refresh, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createHospital({
        name: name.trim(),
        code: code.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
      });
      setName('');
      setCode('');
      setAddress('');
      setPhone('');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (hospital) => {
    setEditingId(hospital.id);
    setEditValues({
      name: hospital.name ?? '',
      code: hospital.code ?? '',
      address: hospital.address ?? '',
      phone: hospital.phone ?? '',
    });
  };

  const saveEdit = async (id) => {
    try {
      await updateHospital(id, editValues);
      setEditingId(null);
      refresh();
    } catch (err) {
      setListError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Hospitals</h1>

        <Card className="mb-8">
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Add a hospital</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Hospital name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Code, e.g. AMSH" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add hospital'}
            </Button>
          </form>
        </Card>

        {listError && <p className="mb-4 text-sm text-danger">{listError}</p>}
        <div className="space-y-3">
          {hospitals.map((h) => (
            <Card key={h.id}>
              {editingId === h.id ? (
                <div className="space-y-2">
                  <Input value={editValues.name} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} />
                  <Input value={editValues.code} onChange={(e) => setEditValues((v) => ({ ...v, code: e.target.value }))} />
                  <Input value={editValues.address} onChange={(e) => setEditValues((v) => ({ ...v, address: e.target.value }))} />
                  <Input value={editValues.phone} onChange={(e) => setEditValues((v) => ({ ...v, phone: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(h.id)}>Save</Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">
                      {h.name}
                      {h.code ? ` (${h.code})` : ''}
                    </p>
                    <p className="text-xs text-muted">{[h.address, h.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                  </div>
                  <button type="button" onClick={() => startEdit(h)} className="text-sm font-medium text-ink underline">
                    Edit
                  </button>
                </div>
              )}
            </Card>
          ))}
          {hospitals.length === 0 && !listError && <p className="text-sm text-muted">No hospitals yet.</p>}
        </div>
      </main>
    </div>
  );
}
