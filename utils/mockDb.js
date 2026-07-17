// utils/mockDb.js
let patients = [];
let bills = [];
let medicines = [];
let billMedicines = [];
let adherenceLogs = [];

export const mockDb = {
  // Patients
  upsertPatient: async ({ mobile, name }) => {
    let patient = patients.find((p) => p.mobile === mobile);
    if (!patient) {
      patient = { id: crypto.randomUUID(), mobile, name: name || '' };
      patients.push(patient);
    } else if (name && !patient.name) {
      patient.name = name;
    }
    return patient;
  },
  getPatientByMobile: async (mobile) => patients.find((p) => p.mobile === mobile),

  // Medicines
  upsertMedicine: async ({ name, image_url = '' }) => {
    let med = medicines.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (!med) {
      med = { id: crypto.randomUUID(), name, image_url };
      medicines.push(med);
    }
    return med;
  },
  getMedicines: async () => medicines,

  // Bills
  createBill: async ({ patientId, shopId = null, totalAmount = 0 }) => {
    const bill = {
      id: crypto.randomUUID(),
      patient_id: patientId,
      shop_id: shopId,
      bill_number: `BILL-${Date.now()}`,
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
    };
    bills.push(bill);
    return bill;
  },
  getBills: async () => bills,
  getBillById: async (id) => bills.find((b) => b.id === id),

  // Bill‑Medicines join
  addBillMedicine: async ({ billId, medicineId, dosageTimes, totalDays = 7, notes = '' }) => {
    const bm = {
      id: crypto.randomUUID(),
      bill_id: billId,
      medicine_id: medicineId,
      dosage_times: dosageTimes,
      total_days: totalDays,
      notes,
      created_at: new Date().toISOString(),
    };
    billMedicines.push(bm);
    return bm;
  },
  getBillMedicinesByBillId: async (billId) =>
    billMedicines.filter((bm) => bm.bill_id === billId),
  getAllBillMedicines: async () => billMedicines,

  // Adherence (mock)
  logAdherence: async ({ patientId, billMedicineId }) => {
    const log = {
      id: crypto.randomUUID(),
      patient_id: patientId,
      bill_medicine_id: billMedicineId,
      dose_time: new Date().toISOString(),
      taken_at: new Date().toISOString(),
    };
    adherenceLogs.push(log);
    return log;
  },
  getAdherenceLogs: async () => adherenceLogs,
};
