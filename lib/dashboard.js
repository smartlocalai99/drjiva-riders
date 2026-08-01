import { supabase } from '../utils/supabaseClient';

async function countRows(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

export async function getDashboardStats() {
  const [patients, medicines, hospitals, dispenses] = await Promise.all([
    countRows('patients'),
    countRows('medicines'),
    countRows('hospitals'),
    countRows('dispenses'),
  ]);
  return { patients, medicines, hospitals, dispenses };
}
