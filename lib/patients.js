import { supabase } from '../utils/supabaseClient';

export async function findPatientByMobile(mobile) {
  const { data, error } = await supabase.from('patients').select('*').eq('mobile', mobile).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPatient({ mobile, name, age, gender }) {
  const { data, error } = await supabase
    .from('patients')
    .insert({ mobile, name, age: age ?? null, gender: gender ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatient(id, { name, age, gender }) {
  const { data, error } = await supabase.from('patients').update({ name, age, gender }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function listPatients({ query = '', limit = 50 } = {}) {
  let request = supabase.from('patients').select('*').order('created_at', { ascending: false });
  if (query) {
    request = request.or(`name.ilike.%${query}%,mobile.ilike.%${query}%`);
  }
  const { data, error } = await request.limit(limit);
  if (error) throw error;
  return data;
}
