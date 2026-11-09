-- ============================================================
--  Sehatify — Skema Supabase (PostgreSQL)
--  Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Definisi 6 faktor (referensi) -----------------------------
create table public.factors (
  key       text primary key,
  label     text not null,
  role      text not null check (role in ('owner','employee')),
  scale_max int  not null,
  q_from    int  not null,   -- nomor soal OH awal
  q_to      int  not null    -- nomor soal OH akhir
);
insert into public.factors values
  ('INS','Sumber Daya',  'owner',    3,  1,  6),
  ('LDI','Kepemimpinan', 'employee', 5,  7, 12),
  ('WEQ','Proses',       'employee', 5, 13, 17),
  ('OV', 'Budaya',       'employee', 5, 18, 25),
  ('OPS','Inovasi',      'owner',    5, 26, 31),
  ('ECT','Eksternal',    'owner',    5, 32, 35);

-- 2. Profil pengguna (1 baris per akun auth) --------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  umkm_name  text not null check (char_length(trim(umkm_name)) >= 2),
  role       text not null check (role in ('owner','employee','admin')),
  lokasi     text,
  sektor     text,
  omzet      bigint check (omzet >= 0),
  created_at timestamptz not null default now()
);
-- Satu UMKM hanya boleh punya satu Owner
create unique index one_owner_per_umkm
  on public.profiles (lower(trim(umkm_name))) where role = 'owner';

-- 3. Pengiriman kuesioner (1 per akun) ---------------------------
create table public.submissions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null unique references public.profiles(id) on delete cascade,
  role       text not null,
  answers    jsonb not null,           -- {"ins_oh1":3, "ov_oh18":4, ...}
  created_at timestamptz not null default now()
);

-- 4. Data survei historis (428 responden, dari data_asli.csv) ---
create table public.survey_responses (
  id         int primary key,
  industry   smallint,                 -- 1 Makanan & Minuman, 2 Fashion, 3 Grosir & Retail
  managed_by smallint,
  age        smallint,
  c_age      smallint,
  ins numeric(4,2), ov numeric(4,2), ldi numeric(4,2),
  weq numeric(4,2), ops numeric(4,2), ect numeric(4,2),
  rata_rata  numeric(4,2),
  kategori   text
);

-- 5. Row Level Security -----------------------------------------
alter table public.factors          enable row level security;
alter table public.profiles         enable row level security;
alter table public.submissions      enable row level security;
alter table public.survey_responses enable row level security;

create policy "factors dapat dibaca"     on public.factors     for select to authenticated using (true);
create policy "profil milik sendiri"     on public.profiles    for select to authenticated using (id = auth.uid());
create policy "submission milik sendiri" on public.submissions for select to authenticated using (user_id = auth.uid());
-- Tidak ada policy INSERT/UPDATE/DELETE: penulisan hanya lewat fungsi di bawah.

-- 6. Buat profil otomatis saat pendaftaran ----------------------
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. Cek owner sudah ada (dipakai form daftar, sebelum login) ---
create or replace function public.owner_exists(p_name text)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.profiles
                 where role = 'owner' and lower(trim(umkm_name)) = lower(trim(p_name)));
$$;

-- 8. Skor satu faktor (skala 0–5) dari jawaban ------------------
create or replace function public.factor_score(a jsonb, f text, max_val int)
returns numeric language sql immutable set search_path = '' as $$
  select round(avg(value::numeric) / max_val * 5, 2)
  from jsonb_each_text(a)
  where left(key, length(f) + 1) = f || '_';
$$;

-- 9. Kirim kuesioner: validasi + simpan --------------------------
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
      v   := p_answers ->> qid;
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

-- 10. View skor gabungan: survei historis + UMKM terdaftar ------
--     INS/OPS/ECT dari Owner; OV/LDI/WEQ rata-rata Pegawai.
--     Total = rata-rata tertimbang (INS .20, OV .18, LDI .17, WEQ/OPS/ECT .15).
create or replace view public.v_scores as
with per as (
  select lower(trim(p.umkm_name)) as k, p.umkm_name, p.lokasi, p.sektor, p.role, s.created_at,
         public.factor_score(s.answers,'ins',3) as ins,
         public.factor_score(s.answers,'ops',5) as ops,
         public.factor_score(s.answers,'ect',5) as ect,
         public.factor_score(s.answers,'ov', 5) as ov,
         public.factor_score(s.answers,'ldi',5) as ldi,
         public.factor_score(s.answers,'weq',5) as weq
  from public.submissions s join public.profiles p on p.id = s.user_id
), u as (
  select k,
         max(umkm_name) filter (where role = 'owner') as label,
         max(lokasi)    filter (where role = 'owner') as lokasi,
         max(sektor)    filter (where role = 'owner') as sektor,
         max(ins) as ins, max(ops) as ops, max(ect) as ect,
         round(avg(ov),2) as ov, round(avg(ldi),2) as ldi, round(avg(weq),2) as weq,
         count(*) filter (where role = 'employee') as n_pegawai,
         max(created_at) as updated_at
  from per group by k
  having bool_or(role = 'owner')
), t as (
  select u.*,
    round(( coalesce(ins,0)*.20 + coalesce(ov,0)*.18 + coalesce(ldi,0)*.17
          + coalesce(weq,0)*.15 + coalesce(ops,0)*.15 + coalesce(ect,0)*.15 )
        / ( .20 + .15 + .15
          + case when ov  is not null then .18 else 0 end
          + case when ldi is not null then .17 else 0 end
          + case when weq is not null then .15 else 0 end ), 2) as total
  from u
)
select 'platform'::text as source, k as umkm_key, label, lokasi, sektor,
       ins, ov, ldi, weq, ops, ect, total,
       case when total >= 4 then 'Sangat Baik' when total > 3 then 'Baik'
            when total >= 2 then 'Cukup' else 'Buruk' end as kategori,
       n_pegawai, updated_at
from t
union all
select 'survei', null, 'Responden ' || lpad(id::text, 3, '0'), null,
       case industry when 1 then 'Makanan & Minuman' when 2 then 'Fashion' else 'Grosir & Retail' end,
       ins, ov, ldi, weq, ops, ect, rata_rata, kategori, null, null
from public.survey_responses;

-- 11. Hak akses --------------------------------------------------
revoke all on public.v_scores from anon, authenticated;
grant select on public.v_scores to authenticated;

revoke all on function public.submit_assessment(jsonb) from public, anon;
grant execute on function public.submit_assessment(jsonb) to authenticated;
grant execute on function public.owner_exists(text) to anon, authenticated;
