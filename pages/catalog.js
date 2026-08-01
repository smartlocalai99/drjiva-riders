// pages/catalog.js
import { useEffect, useRef, useState } from 'react';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { searchMedicines, createMedicine, updateMedicine, updateMedicineImage, uploadMedicineImage } from '../lib/medicines';

export default function Catalog() {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const requestIdRef = useRef(0);

  const runSearch = (q) => {
    const requestId = ++requestIdRef.current;
    searchMedicines(q)
      .then((data) => {
        if (requestIdRef.current === requestId) {
          setSearchError('');
          setMedicines(data);
        }
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          setSearchError(err.message);
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
      const medicine = await createMedicine({ name: name.trim(), price: price ? Number(price) : null });
      if (file) {
        const imageUrl = await uploadMedicineImage(file, medicine.id);
        await updateMedicineImage(medicine.id, imageUrl);
      }
      setName('');
      setPrice('');
      setFile(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePriceChange = (id, value) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, price: value } : m)));
  };

  const handlePriceSave = async (id, value) => {
    try {
      await updateMedicine(id, { price: value === '' ? null : Number(value) });
    } catch (err) {
      setSearchError(err.message);
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
            <Input
              type="number"
              step="0.01"
              min="0"
              mono
              placeholder="Price (₹)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
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
        {searchError && <p className="mb-4 text-sm text-danger">{searchError}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {medicines.map((med) => (
            <Card key={med.id} className="flex flex-col items-center text-center p-3 sm:p-5">
              {med.image_url ? (
                <img src={med.image_url} alt={med.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-control object-cover border border-line mb-2" />
              ) : (
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-control border border-line bg-paper mb-2" />
              )}
              <p className="text-xs sm:text-sm font-medium text-ink line-clamp-2 mb-2">{med.name}</p>
              <Input
                type="number"
                step="0.01"
                min="0"
                mono
                placeholder="Price"
                value={med.price ?? ''}
                onChange={(e) => handlePriceChange(med.id, e.target.value)}
                onBlur={(e) => handlePriceSave(med.id, e.target.value)}
                className="text-center text-xs"
              />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
