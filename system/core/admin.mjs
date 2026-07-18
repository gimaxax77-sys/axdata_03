import { BALANCE } from './balance.mjs';
import { DIFFICULTIES } from './difficulty.mjs';

// ─────────────────────────────────────────────────────────────
// 운영자 조작 — 밸런스 배수/배율을 라이브로 튜닝하고 세이브에 지속.
//   · ADMIN_FIELDS: 조정 가능한 항목(경로+조작 방식) 스키마.
//   · setBalanceValue: BALANCE(모듈 전역)를 즉시 변경 → 전 시스템 반영.
//   · applyOverrides: 세이브의 오버라이드를 부팅 시 재적용.
//   · DEFAULTS: 최초값 스냅샷 → 리셋 지원.
// ─────────────────────────────────────────────────────────────

// 조정 대상. factor=배수 조작(×/÷), step=가감 조작(+/−).
export const ADMIN_FIELDS = [
  { path: 'enemyGrowth', label: '적 강화율 / 층', step: 0.005, min: 1.0, fmt: (v) => v.toFixed(3) },
  { path: 'rewardGrowth', label: '보상 증가율 / 층', step: 0.005, min: 1.0, fmt: (v) => v.toFixed(3) },
  { path: 'enemyBase.hp', label: '적 기본 HP', factor: 1.1, fmt: (v) => Math.round(v) },
  { path: 'enemyBase.atk', label: '적 기본 ATK', factor: 1.1, fmt: (v) => Math.round(v) },
  { path: 'rewardBase.currency', label: '기본 골드 보상', factor: 1.1, fmt: (v) => Math.round(v) },
  { path: 'rewardBase.growth', label: '기본 정수 보상', factor: 1.1, fmt: (v) => Math.round(v) },
  { path: 'statPerLevel', label: '레벨당 스탯 %', step: 0.01, min: 0, fmt: (v) => (v * 100).toFixed(0) + '%' },
  { path: 'statPerRank', label: '랭크당 스탯 %', step: 0.05, min: 0, fmt: (v) => (v * 100).toFixed(0) + '%' },
  { path: 'prestigePowerBonus', label: '환생 파워 / pt', step: 0.02, min: 0, fmt: (v) => (v * 100).toFixed(0) + '%' },
  // 전투력 가중치 (스탯이 전투력에 기여하는 비율)
  { path: 'powerWeights.hp', label: '전투력: 체력 계수', step: 0.01, min: 0, fmt: (v) => v.toFixed(2) },
  { path: 'powerWeights.atk', label: '전투력: 공격 계수', step: 0.05, min: 0, fmt: (v) => v.toFixed(2) },
  { path: 'powerWeights.def', label: '전투력: 방어 계수', step: 0.05, min: 0, fmt: (v) => v.toFixed(2) },
  { path: 'powerWeights.spd', label: '전투력: 속도 계수', step: 0.05, min: 0, fmt: (v) => v.toFixed(2) },
  { path: 'prestigeIncomeBonus', label: '환생 수입 / pt', step: 0.05, min: 0, fmt: (v) => (v * 100).toFixed(0) + '%' },
  // 난이도 보상 배수 (difficulty 배열 직접 조정)
  { path: 'DIFF.hard.rewardMult', label: '험난 보상 배수', factor: 1.15, fmt: (v) => '×' + Math.round(v) },
  { path: 'DIFF.hell.rewardMult', label: '지옥 보상 배수', factor: 1.15, fmt: (v) => '×' + Math.round(v) },
  { path: 'DIFF.abyss.rewardMult', label: '나락 보상 배수', factor: 1.15, fmt: (v) => '×' + Math.round(v) },
];

// 경로 → [객체, 키]. 'DIFF.<id>.<field>'는 DIFFICULTIES를, 그 외는 BALANCE를 가리킨다.
function ref(path) {
  if (path.startsWith('DIFF.')) {
    const [, id, field] = path.split('.');
    const d = DIFFICULTIES.find((x) => x.id === id);
    return [d, field];
  }
  const parts = path.split('.');
  let o = BALANCE;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  return [o, parts[parts.length - 1]];
}

export function getBalanceValue(path) { const [o, k] = ref(path); return o ? o[k] : undefined; }
export function setBalanceValue(path, val) { const [o, k] = ref(path); if (o) o[k] = val; }

// 최초값 스냅샷 (리셋용) — 모듈 로드 시 1회 캡처.
export const DEFAULTS = Object.fromEntries(ADMIN_FIELDS.map((f) => [f.path, getBalanceValue(f.path)]));

// 필드 한 개를 방향(+1/−1)만큼 조정하고 새 값을 반환.
export function adjustField(field, dir) {
  const cur = getBalanceValue(field.path);
  let next = field.factor ? (dir > 0 ? cur * field.factor : cur / field.factor) : cur + dir * field.step;
  if (field.min !== undefined) next = Math.max(field.min, next);
  next = Math.round(next * 1e6) / 1e6;
  setBalanceValue(field.path, next);
  return next;
}

// 세이브 오버라이드({path:val})를 BALANCE/DIFFICULTIES에 재적용 (부팅 시).
export function applyOverrides(overrides) {
  if (!overrides) return;
  for (const [path, val] of Object.entries(overrides)) {
    if (ADMIN_FIELDS.some((f) => f.path === path)) setBalanceValue(path, val);
  }
}

// 전체 초기화 → 최초값 복원.
export function resetAll() {
  for (const [path, val] of Object.entries(DEFAULTS)) setBalanceValue(path, val);
}
