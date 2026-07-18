import { earn } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 상시 순환형 '미니 로드맵' 주간 테마 이벤트.
//   · 매주(UTC epoch-week) 테마가 바뀌며 자연스럽게 서브 재화를 퍼준다.
//   · "이번 주는 무엇에 집중하면 이득"이라는 방향을 주어 정체감을 없앤다.
//   · 로컬 완결(서버 불요): 주기 경계에서 진행도 리셋 + 1회 보상 청구.
// ─────────────────────────────────────────────────────────────

const WEEK_MS = 7 * 86400000;
export function weekIndex(now = Date.now()) { return Math.floor(now / WEEK_MS); }

// 테마: track(집계 대상 행동) 달성 → 보상 상자 1회.
//   track 키는 daily/arena에서 발생하는 행동과 동일하게 recordEvent로 적립.
export const WEEKLY_THEMES = [
  { id: 'skill', label: '스킬 성장의 주', emoji: '📘', track: 'upgrade', goal: 30,
    hint: '캐릭터/스킬 강화가 이득! 강화 30회 달성 상자.', reward: { growth: 3000, summon: 30 } },
  { id: 'gear', label: '장비 단련의 주', emoji: '⚒️', track: 'dungeon', goal: 10,
    hint: '던전을 돌아 장비를 모으세요! 던전 10회 상자.', reward: { currency: 8000, summon: 20 } },
  { id: 'summon', label: '소환 축제의 주', emoji: '🔮', track: 'summon', goal: 20,
    hint: '소환 축제! 소환 20회 달성 상자.', reward: { gem: 300, summon: 50 } },
  { id: 'arena', label: '투기의 주', emoji: '🏆', track: 'arena', goal: 10,
    hint: '아레나에 도전하세요! 승리 10회 상자.', reward: { gem: 400, currency: 6000 } },
];
export function currentTheme(now = Date.now()) {
  return WEEKLY_THEMES[weekIndex(now) % WEEKLY_THEMES.length];
}

function ensure(state, now) {
  state.events = state.events || { week: -1, progress: 0, claimed: false };
  const w = weekIndex(now);
  if (state.events.week !== w) {
    state.events.week = w; state.events.progress = 0; state.events.claimed = false;
  }
  return state.events;
}

// 행동 적립 — 현재 테마의 track과 일치할 때만 진행도 증가.
export function recordEvent(state, key, n = 1, now = Date.now()) {
  const e = ensure(state, now);
  if (currentTheme(now).track === key) e.progress += n;
}

// UI 현황: 테마·진행도·목표·완료·청구·남은 시간.
export function weeklyEvent(state, now = Date.now()) {
  const e = ensure(state, now);
  const theme = currentTheme(now);
  const endsAt = (weekIndex(now) + 1) * WEEK_MS;
  return {
    id: theme.id, label: theme.label, emoji: theme.emoji, hint: theme.hint,
    track: theme.track, goal: theme.goal, reward: theme.reward,
    progress: Math.min(e.progress, theme.goal),
    done: e.progress >= theme.goal, claimed: e.claimed,
    endsInMs: Math.max(0, endsAt - now),
  };
}

// 보상 청구(주 1회) — 지갑 재화 지급.
export function claimWeekly(state, now = Date.now()) {
  const e = ensure(state, now);
  const theme = currentTheme(now);
  if (e.claimed) return { ok: false, reason: '이번 주 이미 수령' };
  if (e.progress < theme.goal) return { ok: false, reason: '목표 미달' };
  earn(state.wallet, theme.reward);
  e.claimed = true;
  return { ok: true, reward: theme.reward };
}
