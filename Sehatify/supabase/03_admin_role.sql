-- Upgrade an existing Sehatify project to support provisioned administrator accounts.
-- Run in Supabase SQL Editor as the project owner.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'employee', 'admin'));

-- Public sign-up may create owner/employee accounts only. Administrators must
-- be assigned manually by a trusted project owner after creating the account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, umkm_name, role, lokasi, sektor, omzet)
  values (
    new.id,
    trim(new.raw_user_meta_data->>'umkm_name'),
    case when new.raw_user_meta_data->>'role' = 'employee' then 'employee' else 'owner' end,
    nullif(new.raw_user_meta_data->>'lokasi', ''),
    nullif(new.raw_user_meta_data->>'sektor', ''),
    nullif(new.raw_user_meta_data->>'omzet', '')::bigint
  );
  return new;
end $$;

create or replace function public.submit_assessment(p_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  me    public.profiles;
  f     record;
  n     int;
  qid   text;
  v     text;
  clean jsonb := '{}';
  bad   text[] := '{}';
begin
  if uid is null then raise exception 'Tidak terautentikasi. Silakan masuk.'; end if;

  select * into me from public.profiles where id = uid;
  if not found then raise exception 'Profil tidak ditemukan.'; end if;
  if me.role not in ('owner', 'employee') then
    raise exception 'Administrator tidak mengisi kuesioner.';
  end if;

  if exists (select 1 from public.submissions where user_id = uid) then
    raise exception 'Anda hanya dapat mengisi kuesioner sekali.';
  end if;

  if me.role = 'employee' and not exists (
    select 1 from public.submissions s join public.profiles p on p.id = s.user_id
    where s.role = 'owner' and lower(trim(p.umkm_name)) = lower(trim(me.umkm_name))
  ) then
    raise exception 'Owner "%" belum mengisi kuesioner. Karyawan dapat mengisi setelah Owner.', me.umkm_name;
  end if;

  for f in select * from public.factors where role = me.role loop
    for n in f.q_from .. f.q_to loop
      qid := lower(f.key) || '_oh' || n;
      v := p_answers ->> qid;
      if v is null or v !~ '^[0-9]+$' or v::int < 1 or v::int > f.scale_max then
        bad := bad || qid;
      else
        clean := clean || jsonb_build_object(qid, v::int);
      end if;
    end loop;
  end loop;

  if array_length(bad, 1) > 0 then
    raise exception 'Jawaban belum lengkap atau di luar rentang: %', array_to_string(bad, ', ');
  end if;

  insert into public.submissions (user_id, role, answers) values (uid, me.role, clean);
end $$;

revoke all on function public.submit_assessment(jsonb) from public, anon;
grant execute on function public.submit_assessment(jsonb) to authenticated;
