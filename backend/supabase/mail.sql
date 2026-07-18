-- ─────────────────────────────────────────────────────────────
-- 우편함(mail) 테이블 + 보안 규칙
--   매니저/운영자가 유저에게(또는 전체에게) 우편+재화를 발송.
--   클라이언트는 자기 우편(+전체 우편)만 읽고, 로컬 우편함으로 흡수해 수령.
--   Supabase SQL Editor 에 붙여넣고 실행하세요. (schema.sql · console.sql 후)
-- ─────────────────────────────────────────────────────────────

-- 매니저/운영자 판정 헬퍼(console.sql 에도 있음 — 중복 실행 무해).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('manager','admin')
  );
$$;

create table if not exists public.mail (
  id             uuid primary key default gen_random_uuid(),
  target_user_id uuid references auth.users(id) on delete cascade, -- null = 전체 발송
  title          text not null,
  rewards        jsonb not null default '{}'::jsonb,  -- { currency, gem, summon, growth }
  created_at     timestamptz not null default now()
);

create index if not exists mail_target_idx on public.mail(target_user_id);

alter table public.mail enable row level security;

-- 읽기: 전체 우편(target null) 또는 내 우편만.
drop policy if exists "mail_read_own_or_all" on public.mail;
create policy "mail_read_own_or_all" on public.mail
  for select using (target_user_id is null or auth.uid() = target_user_id);

-- 발송(insert): 매니저·운영자만.
drop policy if exists "mail_insert_staff" on public.mail;
create policy "mail_insert_staff" on public.mail
  for insert with check (public.is_staff());

-- 삭제: 매니저·운영자만(오발송 회수).
drop policy if exists "mail_delete_staff" on public.mail;
create policy "mail_delete_staff" on public.mail
  for delete using (public.is_staff());
