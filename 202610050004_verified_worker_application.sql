begin;
create or replace function public.swift_worker_apply_verified(p_kind text,p_name text,p_phone text,p_vehicle text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u auth.users; a public.swift_worker_applications;
begin
 select * into u from auth.users where id=auth.uid();
 if not found or u.email_confirmed_at is null or coalesce(u.is_anonymous,false) then raise exception 'Verify your email first';end if;
 if p_kind not in ('runner','driver') or p_kind is null then raise exception 'Choose Runner or Driver';end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 100 or length(trim(coalesce(p_phone,''))) not between 7 and 30 or length(trim(coalesce(p_vehicle,''))) not between 1 and 100 then raise exception 'Complete your name, phone and transport details';end if;
 if public.swift_worker_kind()='admin' then raise exception 'Administrator accounts cannot submit worker applications';end if;
 insert into public.swift_worker_applications(user_id,full_name,email,phone,kind,vehicle)
 values(u.id,trim(p_name),u.email,trim(p_phone),p_kind,trim(p_vehicle)) on conflict(user_id) do nothing;
 select * into a from public.swift_worker_applications where user_id=u.id;
 if a.kind is distinct from p_kind then raise exception 'This email already has a different worker application. Contact SwiftShop to change your workspace';end if;
 return jsonb_build_object('user_id',a.user_id,'kind',a.kind,'status',a.status);
end $$;
revoke all on function public.swift_worker_apply_verified(text,text,text,text) from public,anon;
grant execute on function public.swift_worker_apply_verified(text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
