-- Seed SHANKAR GASTRO HOSPITAL if it does not exist
insert into public.hospitals (name, code)
select 'SHANKAR GASTRO HOSPITAL', 'SHANKAR'
where not exists (
  select 1 from public.hospitals h where upper(h.name) = 'SHANKAR GASTRO HOSPITAL' or h.code = 'SHANKAR'
);
