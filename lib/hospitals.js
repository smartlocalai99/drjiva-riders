import { supabase } from '../utils/supabaseClient';

export async function listHospitals() {
  const { data, error } = await supabase.from('hospitals').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createHospital({ name, code, address, phone }) {
  const { data, error } = await supabase
    .from('hospitals')
    .insert({ name, code: code ?? null, address: address ?? null, phone: phone ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHospital(id, { name, code, address, phone }) {
  const { data, error } = await supabase
    .from('hospitals')
    .update({ name, code, address, phone })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
