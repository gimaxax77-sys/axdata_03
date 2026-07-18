-- ─────────────────────────────────────────────────────────────
-- 운영자 콘솔용 · 원격 설정(remote_config) 테이블 + 보안 규칙
--   매니저/운영자가 공지·이벤트를 여기 쓰면, 모든 플레이어가 읽어 배너로 표시.
--   Supabase SQL Editor 에 붙여넣고 실행하세요. (schema.sql 실행 후)
-- ─────────────────────────────────────────────────────────────

-- 로그인 계정이 매니저/운영자인지 판정하는 헬퍼(정책에서 재사용).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('manager','admin')
  );
$$;

-- 원격 설정: key(예: 'notice','event','balance') → value(문자열/JSON).
create table if not exists public.remote_config (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.remote_config enable row level security;

-- 읽기: 로그인한 누구나(클라이언트가 공지/이벤트를 읽어야 함).
drop policy if exists "config_read_all" on public.remote_config;
create policy "config_read_all" on public.remote_config
  for select using (auth.role() = 'authenticated');

-- 쓰기(추가/수정/삭제): 매니저·운영자만.
drop policy if exists "config_write_staff" on public.remote_config;
create policy "config_write_staff" on public.remote_config
  for all using (public.is_staff()) with check (public.is_staff());
