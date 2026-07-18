-- ─────────────────────────────────────────────────────────────
-- IAP(인앱결제) 영수증 검증용 · 결제 기록(purchases) 테이블 + 보안 규칙
--   클라이언트는 자기 결제내역만 조회. 기록(insert)은 서버(Edge Function,
--   service_role)만 한다 → 클라이언트가 결제를 위조해 넣을 수 없다.
--   Supabase SQL Editor 에 붙여넣고 실행하세요.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null check (platform in ('ios','android','web')),
  product_id  text not null,
  token       text,                          -- 스토어 영수증 토큰(검증 후 보관)
  status      text not null default 'pending' check (status in ('pending','verified','failed','refunded')),
  created_at  timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists purchases_user_idx on public.purchases(user_id);

alter table public.purchases enable row level security;

-- 조회: 본인 결제내역만.
drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own" on public.purchases
  for select using (auth.uid() = user_id);

-- ⚠ insert/update 정책은 두지 않는다 → 클라이언트는 결제를 기록할 수 없다.
--    기록·검증은 오직 Edge Function(service_role 키, RLS 우회)만 수행한다.
