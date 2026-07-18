import { getPartyUnits } from '../../system/core/gameState.mjs';
import { partyPowerEff, arenaPowerTier } from '../../system/core/arena.mjs';
import { accountMods } from '../../system/core/balance.mjs';
import { getProfile } from '../../system/core/cosmetics.mjs';

// ─────────────────────────────────────────────────────────────
// PvP 파사드 — 실 서버(리더보드/매칭)는 provider(globalThis.__ELDRIA_CLOUD__)에
// pvp 메서드가 등록됐을 때만 사용. 미등록이면 전부 null → 로컬 시뮬 아레나로 폴백.
//
// provider(선택) 인터페이스:
//   pvpUploadDefense(snapshot): Promise<{ok}>
//   pvpMatchmake(): Promise<{ defender, result }>   // 서버 재-시뮬 결과
//   pvpLeaderboard(ladder): Promise<{ top:[], myRank }>
// ─────────────────────────────────────────────────────────────

function provider() {
  return (typeof globalThis !== 'undefined' && globalThis.__ELDRIA_CLOUD__) || null;
}
export function cloudPvpAvailable() {
  const p = provider();
  return !!(p && p.pvpMatchmake);
}

// 방어 스냅샷 — 전투 재현에 필요한 최소치(세이브 전체 아님).
export function buildDefenseSnapshot(state) {
  const power = partyPowerEff(state);
  const prof = getProfile(state);
  return {
    name: prof.name,
    power: Math.round(power),
    tierIndex: arenaPowerTier(power).index,
    party: getPartyUnits(state),           // 편성 유닛 인스턴스(장비/룬/스킨/각인 포함)
    powerMult: accountMods(state).powerMult, // 환생·유물·펫·엠블럼·정령 합산(서버 재-시뮬용)
    formation: state.formation || {},
  };
}

export async function cloudUploadDefense(state) {
  const p = provider();
  if (!p || !p.pvpUploadDefense) return { ok: false, reason: 'pvp-off' };
  try { return await p.pvpUploadDefense(buildDefenseSnapshot(state)); } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}
export async function cloudMatchmake() {
  const p = provider();
  if (!p || !p.pvpMatchmake) return null;
  try { return await p.pvpMatchmake(); } catch { return null; }
}
export async function cloudLeaderboard(ladder) {
  const p = provider();
  if (!p || !p.pvpLeaderboard) return null;
  try { return await p.pvpLeaderboard(ladder); } catch { return null; }
}
