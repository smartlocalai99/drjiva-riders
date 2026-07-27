-- Update Sunrise Multi Speciality Hospital/Sri Sri Holistic Hospitals code to HOLISTICS
update public.hospitals
set code = 'HOLISTICS', name = 'Sri Sri Holistic Hospitals'
where code = 'SUNRISE';
