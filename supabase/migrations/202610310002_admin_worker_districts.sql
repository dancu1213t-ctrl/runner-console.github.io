create or replace function public.swift_admin_worker_zones() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.swift_region_admin() then raise exception 'Administrator access required'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'zone_id',zone_id)) from public.swift_worker_zones),'[]'::jsonb);
end $$;
revoke all on function public.swift_admin_worker_zones() from public,anon;
grant execute on function public.swift_admin_worker_zones() to authenticated;
