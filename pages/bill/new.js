// pages/bill/new.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { mockDb } from '../../utils/mockDb';
import { useAuth } from '../../utils/AuthContext';

export default function NewBill() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { patient } = useAuth();

  const createBill = async () => {
    if (!patient) return;
    setLoading(true);
    const bill = await mockDb.createBill({ patientId: patient.id });
    setLoading(false);
    router.replace('/dashboard');
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-6">Create New Bill</h1>
      <button
        onClick={createBill}
        disabled={loading}
        className="bg-primary hover:bg-primary/80 py-2 px-4 rounded"
      >
        {loading ? 'Creating…' : 'Create Bill'}
      </button>
    </div>
  );
}
