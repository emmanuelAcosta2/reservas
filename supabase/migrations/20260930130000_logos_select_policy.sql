-- Falta la política de SELECT del bucket "logos": sin ella, `upload()` (que hace un
-- `INSERT ... RETURNING`) se rechaza con "new row violates row-level security policy for table
-- objects" aunque el INSERT en sí cumpla el WITH CHECK — el bucket público exime de RLS la
-- descarga pública, no el RETURNING de una operación autenticada.
create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_organizacion()::text);
