import { supabase } from '../utils/supabaseClient';

export async function createDispense({ patientId, hospitalId, staffId, notes, items }) {
  const { data: dispense, error: dispenseError } = await supabase
    .from('dispenses')
    .insert({ patient_id: patientId, hospital_id: hospitalId, staff_id: staffId, notes: notes ?? null })
    .select()
    .single();
  if (dispenseError) throw dispenseError;

  const rows = items.map((item) => ({
    dispense_id: dispense.id,
    medicine_id: item.medicineId,
    timing: item.timing,
    food_instruction: item.foodInstruction,
    quantity: item.quantity,
    duration_days: item.durationDays,
  }));
  const { error: itemsError } = await supabase.from('dispense_items').insert(rows);
  if (itemsError) throw itemsError;

  return dispense;
}

export async function getDispenseHistory(patientId) {
  const { data, error } = await supabase
    .from('dispenses')
    .select(
      `id, notes, created_at,
       hospitals ( name ),
       dispense_items (
         id, timing, food_instruction, quantity, duration_days,
         medicines ( id, name, image_url )
       )`
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
