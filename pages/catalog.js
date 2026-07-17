// pages/catalog.js
import { useEffect, useRef, useState } from 'react';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { searchMedicines, createMedicine, updateMedicineImage, uploadMedicineImage } from '../lib/medicines';

export default function Catalog() {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const runSearch = (q) => {
    const requestId = ++requestIdRef.current;
    searchMedicines(q).then((data) => {
      if (requestIdRef.current === requestId) {
        setMedicines(data);
      }
    });
  };

  const refresh = () => runSearch(query);

  useEffect(() => {
    runSearch(query);
  }, [query]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const medicine = await createMedicine({ name: name.trim() });
      if (file) {
        const imageUrl = await uploadMedicineImage(file, medicine.id);
        await updateMedicineImage(medicine.id, imageUrl);
      }
      setName('');
      setFile(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Medicine catalog</h1>

        <Card className="mb-8">
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Add a medicine</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Medicine name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add medicine'}
            </Button>
          </form>
        </Card>

        <Input placeholder="Search catalog" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-4" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {medicines.map((med) => (
            <Card key={med.id} className="flex flex-col items-center text-center">
              {med.image_url ? (
                <img src={med.image_url} alt={med.name} className="h-16 w-16 rounded-control object-cover border border-line mb-2" />
              ) : (
                <div className="h-16 w-16 rounded-control border border-line bg-paper mb-2" />
              )}
              <p className="text-sm font-medium text-ink">{med.name}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
