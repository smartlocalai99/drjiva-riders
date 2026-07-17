import { supabase } from '../utils/supabaseClient';

export async function searchMedicines(query) {
  let request = supabase.from('medicines').select('*').order('name');
  if (query) {
    request = request.ilike('name', `%${query}%`);
  }
  const { data, error } = await request.limit(50);
  if (error) throw error;
  return data;
}

export async function createMedicine({ name, imageUrl, category }) {
  const { data, error } = await supabase
    .from('medicines')
    .insert({ name, image_url: imageUrl ?? null, category: category ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMedicineImage(id, imageUrl) {
  const { data, error } = await supabase.from('medicines').update({ image_url: imageUrl }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function uploadMedicineImage(file, medicineId) {
  const ext = file.name.split('.').pop();
  const path = `${medicineId}.${ext}`;
  const { error } = await supabase.storage.from('medicine-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('medicine-images').getPublicUrl(path);
  return data.publicUrl;
}
