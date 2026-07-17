// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { mockDb } from '../utils/mockDb';

export default function Dashboard() {
  const [bills, setBills] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchBills = async () => {
      const data = await mockDb.getBills();
      setBills(data);
    };
    fetchBills();
  }, []);

  const handleNewBill = () => {
    router.push('/bill/new');
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl mb-6">Shop Dashboard</h1>
      <button
        onClick={handleNewBill}
        className="bg-primary hover:bg-primary/80 py-2 px-4 rounded mb-4"
      >
        + New Bill
      </button>
      {bills.length === 0 ? (
        <p>No bills yet. Create one!</p>
      ) : (
        <div className="grid gap-4">
          {bills.map((b) => (
            <div key={b.id} className="glass p-4 rounded">
              <p><strong>Bill #:</strong> {b.bill_number}</p>
              <p><strong>Patient:</strong> {b.patient_id}</p>
              <p><strong>Total:</strong> ₹{b.total_amount || 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
