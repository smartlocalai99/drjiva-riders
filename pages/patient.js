// pages/patient.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { mockDb } from '../utils/mockDb';

export default function PatientHome() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: mobile, 2: patient details & medicines
  const [mobile, setMobile] = useState('');
  const [patient, setPatient] = useState(null);
  const [name, setName] = useState('');

  // medicine entry state
  const [medicinesList, setMedicinesList] = useState([]);
  const [selectedMed, setSelectedMed] = useState(''); // medicine id
  const [newMedName, setNewMedName] = useState(''); // for creating new med
  const [dosageTimes, setDosageTimes] = useState('');
  const [addedMeds, setAddedMeds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load medicines on mount
  useEffect(() => {
    (async () => {
      const meds = await mockDb.getMedicines();
      setMedicinesList(meds);
    })();
  }, []);

  // ---- Step 1: mobile lookup ----
  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    const existing = await mockDb.getPatientByMobile(mobile);
    if (existing) {
      setPatient(existing);
      setName(existing.name || '');
    }
    setStep(2);
  };

  // ---- Step 2: patient creation / confirmation ----
  const handleCreatePatient = async () => {
    if (!mobile) return;
    const p = await mockDb.upsertPatient({ mobile, name });
    setPatient(p);
  };

  // ---- Medicine handling ----
  const handleAddMedicine = async () => {
    if (!dosageTimes) return;
    let medObj;
    if (newMedName) {
      medObj = await mockDb.upsertMedicine({ name: newMedName });
    } else if (selectedMed) {
      medObj = medicinesList.find((m) => m.id === selectedMed);
    } else {
      return;
    }
    setAddedMeds((prev) => [...prev, { ...medObj, dosageTimes }]);
    // reset fields
    setSelectedMed('');
    setNewMedName('');
    setDosageTimes('');
  };

  const handleCreateBill = async () => {
    if (!patient) return;
    setLoading(true);
    const bill = await mockDb.createBill({ patientId: patient.id });
    // attach medicines
    for (const m of addedMeds) {
      await mockDb.addBillMedicine({
        billId: bill.id,
        medicineId: m.id,
        dosageTimes: m.dosageTimes,
      });
    }
    setLoading(false);
    router.replace('/dashboard');
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl mb-6">Shop Home – Patient & Bill</h1>

      {step === 1 && (
        <form onSubmit={handleMobileSubmit} className="glass p-6 rounded mb-8">
          <label className="block mb-2">Enter Patient Mobile:</label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            className="w-full p-2 mb-4 rounded bg-white/10"
          />
          <button type="submit" className="bg-primary hover:bg-primary/80 py-2 px-4 rounded">
            Next
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="glass p-6 rounded">
          {/* Patient info */}
          {patient ? (
            <div className="mb-6">
              <p className="mb-2">
                <strong>Existing Patient:</strong> {patient.name || '(no name)'}
              </p>
              <button
                onClick={() => setPatient(null)}
                className="text-sm underline"
              >
                Change patient
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block mb-2">Patient Name (new):</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-2 mb-2 rounded bg-white/10"
              />
              <button
                onClick={handleCreatePatient}
                className="bg-primary hover:bg-primary/80 py-2 px-4 rounded"
              >
                Save Patient
              </button>
            </div>
          )}

          {/* Medicine entry – shown only after we have a patient record */}
          {patient && (
            <div>
              <h2 className="text-2xl mb-4">Add Medicines to Bill</h2>
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                {/* Existing medicines dropdown */}
                <select
                  value={selectedMed}
                  onChange={(e) => setSelectedMed(e.target.value)}
                  className="p-2 rounded bg-white/10"
                >
                  <option value="">-- Select Medicine --</option>
                  {medicinesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {/* New medicine name */}
                <input
                  type="text"
                  placeholder="New medicine name (optional)"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="p-2 rounded bg-white/10"
                />
                {/* Dosage times */}
                <input
                  type="text"
                  placeholder="Dosage times (e.g., 8am,2pm,8pm)"
                  value={dosageTimes}
                  onChange={(e) => setDosageTimes(e.target.value)}
                  className="p-2 rounded bg-white/10 col-span-2"
                />
                <button
                  onClick={handleAddMedicine}
                  className="bg-primary hover:bg-primary/80 py-2 px-4 rounded col-span-2"
                >
                  Add Medicine to Bill
                </button>
              </div>

              {/* List of added medicines */}
              {addedMeds.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xl mb-2">Medicines in this Bill</h3>
                  <ul className="space-y-2">
                    {addedMeds.map((m, idx) => (
                      <li key={idx} className="glass p-2 rounded">
                        {m.name} – <span className="font-mono">{m.dosageTimes}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleCreateBill}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 py-2 px-4 rounded"
              >
                {loading ? 'Creating Bill…' : 'Create Bill'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
