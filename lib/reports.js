import { supabase } from '../utils/supabaseClient';

export async function uploadPatientReport({ patientId, hospitalId, staffId, label, file }) {
  const ext = file.name.split('.').pop();
  const path = `${patientId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('patient-reports').upload(path, file);
  if (uploadError) throw uploadError;

  const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
  const { data, error } = await supabase
    .from('patient_reports')
    .insert({
      patient_id: patientId,
      hospital_id: hospitalId,
      uploaded_by: 'hospital',
      uploaded_by_staff_id: staffId,
      label: label || null,
      file_url: path,
      file_type: fileType,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPatientReports(patientId) {
  const { data, error } = await supabase
    .from('patient_reports')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSignedReportUrl(path) {
  const { data, error } = await supabase.storage.from('patient-reports').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
