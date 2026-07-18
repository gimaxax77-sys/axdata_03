-- ─────────────────────────────────────────────────────────────
-- 엘드리아 연대기 · Supabase 스키마 (계정 + 역할 + 클라우드 세이브)
--   Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
--   auth.users 는 Supabase가 로그인 시 자동 생성합니다. 여기서는
--   그 위에 profiles(역할)·saves(세이브) 두 테이블과 보안 규칙(RLS)만 얹습니다.
-- ─────────────────────────────────────────────────────────────

-- 1) 프로필: 로그인 계정마다 1행. 역할(role)을 여기 보관.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'user' check (role in ('user','manager','admin')),
  nickname   text,
  banned     boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) 세이브: 계정당 1행(봉투 형태 — sync.mjs 의 envelope 와 동일 필드).
create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  blob       text,                       -- serialize() 문자열
  version    integer not null default 0, -- SAVE_VERSION
  progress   bigint  not null default 0, -- saveProgress() 단조 지표
  updated_at timestamptz not null default now()
);

-- 3) 신규 가입 시 프로필 자동 생성(역할 기본 'user').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 4) 행 수준 보안(RLS) — 여기가 진짜 보안 경계입니다.
--    클라이언트는 자기 데이터만 읽고 쓸 수 있습니다.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.saves    enable row level security;

-- 프로필: 본인 것만 조회.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- 프로필: 본인 것만 수정하되, role·banned 는 클라이언트가 못 바꾸게 잠근다.
--   (role/banned 변경은 서버의 service_role 키로만 — RLS를 우회하는 관리 경로)
drop policy if exists "profiles_update_own_safe" on public.profiles;
create policy "profiles_update_own_safe" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and banned = (select banned from public.profiles where id = auth.uid())
  );

-- 세이브: 본인 것만 조회·기록.
drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "saves_upsert_own" on public.saves;
create policy "saves_insert_own" on public.saves
  for insert with check (auth.uid() = user_id);
drop policy if exists "saves_update_own" on public.saves;
create policy "saves_update_own" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 5) 최초 운영자 임명 (본인 계정을 admin 으로).
--    먼저 앱/대시보드에서 한 번 로그인해 계정을 만든 뒤,
--    아래 이메일을 본인 것으로 바꿔 실행하세요.
-- ─────────────────────────────────────────────────────────────
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'gimaxax77@gmail.com');
