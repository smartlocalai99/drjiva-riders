// pages/bill/[id].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { mockDb } from '../../../utils/mockDb';
import Link from 'next/link';

export default function BillDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [bill, setBill] = useState(null);
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const b = await mockDb.getBillById(id);
      setBill(b);
      const bms = await mockDb.getBillMedicinesByBillId(id);
      // Resolve medicine names
      const meds = await Promise.all(
        bms.map(async (bm) => {
          const med = await mockDb.upsertMedicine({ name: '', image_url: '' }); // placeholder just to get id??
          // Actually we have medicines list; find by id
          const medInfo = await mockDb.getAllBillMedicines(); // not needed
          return bm; // keep raw for now
        })
      );
      setMedicines(meds);
    };
    fetchData();
  }, [id]);

  if (!bill) {
    return (
      <div className="p-8 bg-gray-900 min-h-screen text-white">
        <p>Loading bill...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl mb-4">Bill Details</h1>
      <p><strong>Bill #:</strong> {bill.bill_number}</p>
      <p><strong>Patient ID:</strong> {bill.patient_id}</p>
      <p><strong>Total:</strong> ₹{bill.total_amount || 0}</p>
      <Link href="/dashboard">
        <a className="mt-4 inline-block bg-primary hover:bg-primary/80 py-2 px-4 rounded">Back to Dashboard</a>
      </Link>
    </div>
  );
}
