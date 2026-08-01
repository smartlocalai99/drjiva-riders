// pages/dispense/new.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import SegmentedControl from '../../components/ui/SegmentedControl';
import DosageTimingPicker from '../../components/ui/DosageTimingPicker';
import { findPatientByMobile } from '../../lib/patients';
import { searchMedicines } from '../../lib/medicines';
import { createDispense } from '../../lib/dispenses';
import { useHospital } from '../../utils/HospitalContext';

const FOOD_OPTIONS = [
  { value: 'before_food', label: 'Before food' },
  { value: 'after_food', label: 'After food' },
];

export default function NewDispense() {
  const router = useRouter();
  const { patient: mobile } = router.query;
  const { currentHospital } = useHospital();

  const [patient, setPatient] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mobile) return;
    findPatientByMobile(mobile)
      .then(setPatient)
      .catch((err) => setError(err.message));
  }, [mobile]);

  useEffect(() => {
    let active = true;
    searchMedicines(query)
      .then((data) => {
        if (active) setResults(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const addMedicine = (medicine) => {
    setItems((prev) => [
      ...prev,
      { medicine, timing: [], foodInstruction: 'after_food', quantity: '1 tablet', durationDays: 5 },
    ]);
    setQuery('');
    setFocused(false);
  };

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');
    if (!currentHospital) {
      setError('Pick a hospital from the top bar first.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one medicine.');
      return;
    }
    if (items.some((item) => item.timing.length === 0)) {
      setError('Every medicine needs at least one time of day.');
      return;
    }
    setSaving(true);
    try {
      await createDispense({
        patientId: patient.id,
        hospitalId: currentHospital.id,
        staffId: null,
        items: items.map((item) => ({
          medicineId: item.medicine.id,
          timing: item.timing,
          foodInstruction: item.foodInstruction,
          quantity: item.quantity,
          durationDays: Number(item.durationDays),
        })),
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
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 pb-28">
        <Card className="mb-6">
          <p className="font-display text-xl font-semibold text-ink">{patient.name || 'Unnamed patient'}</p>
          <p className="font-mono text-sm text-muted">{patient.mobile}</p>
        </Card>

        <h1 className="font-display text-lg font-semibold text-ink mb-3">Add medicines</h1>
        <Card className="mb-6">
          <div className="relative">
            <Input
              placeholder="Search medicine catalog (click to show all)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocused(true);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {focused && results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-control border border-line bg-surface shadow-lg">
                {results.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addMedicine(med);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-paper transition-colors"
                  >
                    {med.image_url ? (
                      <img src={med.image_url} alt={med.name} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-paper border border-line" />
                    )}
                    <span className="text-sm text-ink font-medium">{med.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {items.map((item, index) => (
          <Card key={index} className="mb-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.medicine.image_url ? (
                  <img
                    src={item.medicine.image_url}
                    alt={item.medicine.name}
                    className="h-10 w-10 rounded-control object-cover border border-line"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-control border border-line bg-paper" />
                )}
                <p className="font-medium text-ink">{item.medicine.name}</p>
              </div>
              <button type="button" onClick={() => removeItem(index)} className="text-sm text-danger">
                Remove
              </button>
            </div>

            <DosageTimingPicker value={item.timing} onChange={(timing) => updateItem(index, { timing })} />

            <div className="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:items-center">
              <div className="flex justify-start">
                <SegmentedControl
                  options={FOOD_OPTIONS}
                  value={item.foodInstruction}
                  onChange={(v) => updateItem(index, { foodInstruction: v })}
                />
              </div>
              <Input
                placeholder="Quantity, e.g. 1 tablet"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value })}
              />
              <Input
                type="number"
                min="1"
                mono
                placeholder="Days"
                value={item.durationDays}
                onChange={(e) => updateItem(index, { durationDays: e.target.value })}
              />
            </div>
          </Card>
        ))}

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-4">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save & notify patient'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
