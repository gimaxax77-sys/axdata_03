import { toCombatProfile } from './units.mjs';
import { affinity } from './elements.mjs';
import { teamSynergy } from './synergy.mjs';
import { formationActive, formationModsFor, hasFrontLine } from './formation.mjs';

// ─────────────────────────────────────────────────────────────
// 전투 판정 엔진 — 시스템의 심장.
// 파티 vs 도전(challenge)을 결정론적으로 계산해
//   { win, duration } 를 반환한다.
//
//   · win      : RPG 장르가 사용 (승패로 진행 게이팅)
//   · duration : 방치형 장르가 사용 (클리어 소요 초 → 초당 보상)
//
// 스킬 전투 효과를 반영한다:
//   치명타 → dps에 이미 반영(프로필 단계)
//   흡혈(lifesteal)  → 파티 유효 HP 증가
//   관통(defPierce)  → 적 방어 무시
//   팀버프(teamBuffAtk) → 파티 dps 배수
// ─────────────────────────────────────────────────────────────

// 방어(def)에 의한 피해 감쇠 계수: 100/(100+def)
function mitigation(def) {
  return 100 / (100 + Math.max(0, def));
}

// challenge 형태: { hp, atk, def }  (스칼라 적)
// accountMods.powerMult: 계정 단위 영구 파워 배수(환생 보너스 등). 기본 1.
export function resolve(party, challenge, accountMods = {}, formation = null) {
  if (!party.length) return { win: false, duration: Infinity, log: '파티 없음' };
  const powerMult = accountMods.powerMult || 1;

  const profiles = party.map(toCombatProfile);
  // 진형: 후열이 1명 이상일 때만 발동(하위호환). 전열=방어벽, 후열=보호받는 딜러.
  if (formationActive(formation, party)) {
    const hasFront = hasFrontLine(formation, party);
    for (const p of profiles) {
      const m = formationModsFor(formation, p.uid, hasFront);
      p.dps *= m.dps || 1; p.def *= m.def || 1; p.hp *= m.hp || 1;
    }
  }
  // 파티 구성 시너지 (삼위일체·진형·속성 결속) — 팀 전체 배수
  const syn = teamSynergy(party).mult;

  // 팀 버프 합산 (지원형 원형 + 지휘 스킬 등)
  const atkMult = 1 + profiles.reduce((s, p) => s + (p.teamBuffAtk || 0), 0);
  // 팀 치명 버프 → 파티 dps 배수 (치명 지원형)
  const critMult = 1 + profiles.reduce((s, p) => s + (p.teamBuffCrit || 0), 0);
  // 팀 방어 버프 → 파티 피해경감 (수호 지원형, 상한 60%)
  const teamDefReduce = Math.min(0.6, profiles.reduce((s, p) => s + (p.teamBuffDef || 0), 0));
  // 흡혈 합산 (상한 60%) → 파티 실효 HP 증가
  const lifesteal = Math.min(
    0.6,
    profiles.reduce((s, p) => s + (p.effect?.lifesteal || 0), 0)
  );
  // 방어 관통은 파티 내 최댓값 사용
  const defPierce = Math.min(
    0.9,
    Math.max(0, ...profiles.map((p) => p.effect?.defPierce || 0))
  );
  // 받는 피해 감소 — 파티 평균(상한 60%). 방어와 별개의 생존 축.
  const dmgReduce = Math.min(
    0.6,
    profiles.reduce((s, p) => s + (p.effect?.dmgReduce || 0), 0) / profiles.length
  );
  // ── 신규 능력치 ──
  // 절대공격(고정 딜) — 방어 감쇠를 우회하는 딜 비율. 파티 최댓값(상한 90%).
  const trueDamage = Math.min(0.9, Math.max(0, ...profiles.map((p) => p.effect?.trueDamage || 0)));
  // 명중 — 적 회피를 상쇄(파티 최댓값). 회피 — 파티 평균으로 적 명중 대비 회피율(상한 50%).
  const accuracy = Math.max(0, ...profiles.map((p) => p.effect?.accuracy || 0));
  const evasion = profiles.reduce((s, p) => s + (p.effect?.evasion || 0), 0) / profiles.length;
  // 절대방어 — 상한(피해감소 60%)을 우회하는 별도 경감(상한 50%). 파티 평균.
  const absDef = Math.min(0.5, profiles.reduce((s, p) => s + (p.effect?.absDef || 0), 0) / profiles.length);
  // 적 회피/명중(고난이도·보스에서 부여). 우리 명중이 적 회피를, 적 명중이 우리 회피를 상쇄.
  const enemyEva = Math.min(0.9, Math.max(0, (challenge.eva || 0) - accuracy));
  const effEvasion = Math.min(0.5, Math.max(0, evasion - (challenge.acc || 0)));

  const partyHP = profiles.reduce((s, p) => s + p.hp, 0);
  const partyHPeff = partyHP * (1 + lifesteal) * powerMult * syn.hp;
  // 각 유닛의 dps에 속성 상성 배수 적용 (적 속성 대비 유리/불리)
  const rawDPS = profiles.reduce((s, p) => s + p.dps * affinity(p.element, challenge.element), 0)
    * atkMult * critMult * powerMult * syn.atk;
  const avgDef = profiles.reduce((s, p) => s + p.def, 0) / profiles.length * syn.def;

  const enemyDefEff = challenge.def * (1 - defPierce);
  // 방어 감쇠 후 통과율. 절대공격은 감쇠된 부분 일부를 고정 딜로 회수(상한 100%).
  const mitig = mitigation(enemyDefEff);
  const throughput = mitig + trueDamage * (1 - mitig);
  // 파티가 적에게 넣는 유효 DPS (적 방어 + 절대공격 + 적 회피 반영)
  const partyEffDPS = Math.max(1, rawDPS * throughput * (1 - enemyEva));
  // 적이 파티에게 넣는 유효 DPS (방어 + 팀방어 + 받는피해감소 + 절대방어 + 회피 반영)
  const enemyEffDPS = Math.max(1, challenge.atk * mitigation(avgDef)
    * (1 - teamDefReduce) * (1 - dmgReduce) * (1 - absDef) * (1 - effEvasion));

  const timeToKillEnemy = challenge.hp / partyEffDPS;
  const timeToKillParty = partyHPeff / enemyEffDPS;

  const win = timeToKillEnemy <= timeToKillParty;
  return {
    win,
    duration: win ? timeToKillEnemy : timeToKillParty, // 초
    // 승부 여유: 파티전멸시간/적처치시간. >1이면 승리, 클수록 여유.
    margin: timeToKillParty / timeToKillEnemy,
    partyPower: Math.round(rawDPS),
    partyHP: Math.round(partyHPeff),
    log: win
      ? `승리 (${timeToKillEnemy.toFixed(1)}초 소요)`
      : `패배 (${timeToKillParty.toFixed(1)}초 버팀)`,
  };
}

// ─────────────────────────────────────────────────────────────
// 전투 통계(DPS 미터) — 유저가 "누가 딜을 못 넣나"를 분석하도록 유닛별 기여를 노출.
//   판정 엔진과 같은 규약(진형·속성 상성·치명)을 써서 화면에 그대로 신뢰할 수 있게 한다.
//   반환: { units:[{uid, dps, hp, dpsShare, hpShare, element, affinity}], totalDPS, totalHP }
//   dpsShare/hpShare = 파티 내 비중(0~1). 덱 수정의 근거를 제공한다.
// ─────────────────────────────────────────────────────────────
export function combatContributions(party, challenge = {}, accountMods = {}, formation = null) {
  if (!party || !party.length) return { units: [], totalDPS: 0, totalHP: 0 };
  const powerMult = accountMods.powerMult || 1;
  const profiles = party.map(toCombatProfile);
  if (formationActive(formation, party)) {
    const hasFront = hasFrontLine(formation, party);
    for (const p of profiles) {
      const m = formationModsFor(formation, p.uid, hasFront);
      p.dps *= m.dps || 1; p.def *= m.def || 1; p.hp *= m.hp || 1;
    }
  }
  const syn = teamSynergy(party).mult;
  const atkMult = (1 + profiles.reduce((s, p) => s + (p.teamBuffAtk || 0), 0))
    * (1 + profiles.reduce((s, p) => s + (p.teamBuffCrit || 0), 0));
  const rows = profiles.map((p) => {
    const aff = affinity(p.element, challenge.element);
    return {
      uid: p.uid,
      element: p.element,
      affinity: aff, // 속성 상성 배수(>1 유리, <1 불리)
      dps: p.dps * aff * atkMult * powerMult * syn.atk,
      hp: p.hp * powerMult * syn.hp,
    };
  });
  const totalDPS = rows.reduce((s, r) => s + r.dps, 0) || 1;
  const totalHP = rows.reduce((s, r) => s + r.hp, 0) || 1;
  for (const r of rows) {
    r.dpsShare = r.dps / totalDPS;
    r.hpShare = r.hp / totalHP;
    r.dps = Math.round(r.dps);
    r.hp = Math.round(r.hp);
  }
  // 딜 비중 내림차순(주력·비주력 즉시 식별).
  rows.sort((a, b) => b.dpsShare - a.dpsShare);
  return { units: rows, totalDPS: Math.round(totalDPS), totalHP: Math.round(totalHP) };
}

// ─────────────────────────────────────────────────────────────
// PvP 판정 — 파티 vs 파티(비동기). resolve()와 "완전히 같은" 스탯 공식을 쓰되,
// 스칼라 적 대신 방어 파티를 집계해 대칭으로 겨룬다.
//   양측 유효 DPS·유효 HP를 구해 서로의 처치시간을 비교(짧은 쪽 승).
//   속성 상성은 각 파티의 "대표(최다) 속성"으로 근사한다(결정론 유지).
// ─────────────────────────────────────────────────────────────

// 한 파티를 전투 집계로 환산(공격·생존 지표). resolve() 내부 로직과 동일 규약.
function aggregateSide(party, accountMods = {}, formation = null) {
  const powerMult = accountMods.powerMult || 1;
  const profiles = party.map(toCombatProfile);
  if (formationActive(formation, party)) {
    const hasFront = hasFrontLine(formation, party);
    for (const p of profiles) {
      const m = formationModsFor(formation, p.uid, hasFront);
      p.dps *= m.dps || 1; p.def *= m.def || 1; p.hp *= m.hp || 1;
    }
  }
  const syn = teamSynergy(party).mult;
  const n = profiles.length || 1;
  const atkMult = 1 + profiles.reduce((s, p) => s + (p.teamBuffAtk || 0), 0);
  const critMult = 1 + profiles.reduce((s, p) => s + (p.teamBuffCrit || 0), 0);
  const teamDefReduce = Math.min(0.6, profiles.reduce((s, p) => s + (p.teamBuffDef || 0), 0));
  const lifesteal = Math.min(0.6, profiles.reduce((s, p) => s + (p.effect?.lifesteal || 0), 0));
  const defPierce = Math.min(0.9, Math.max(0, ...profiles.map((p) => p.effect?.defPierce || 0)));
  const dmgReduce = Math.min(0.6, profiles.reduce((s, p) => s + (p.effect?.dmgReduce || 0), 0) / n);
  const trueDamage = Math.min(0.9, Math.max(0, ...profiles.map((p) => p.effect?.trueDamage || 0)));
  const accuracy = Math.max(0, ...profiles.map((p) => p.effect?.accuracy || 0));
  const evasion = profiles.reduce((s, p) => s + (p.effect?.evasion || 0), 0) / n;
  const absDef = Math.min(0.5, profiles.reduce((s, p) => s + (p.effect?.absDef || 0), 0) / n);
  const ehp = profiles.reduce((s, p) => s + p.hp, 0) * (1 + lifesteal) * powerMult * syn.hp;
  const avgDef = profiles.reduce((s, p) => s + p.def, 0) / n * syn.def;
  const baseDPS = profiles.reduce((s, p) => s + p.dps, 0) * atkMult * critMult * powerMult * syn.atk;
  // 대표 속성(최다). 동률이면 먼저 나온 것.
  const elem = {};
  for (const p of profiles) if (p.element) elem[p.element] = (elem[p.element] || 0) + 1;
  let dominant = null, best = 0;
  for (const [e, c] of Object.entries(elem)) if (c > best) { best = c; dominant = e; }
  return { baseDPS, ehp, avgDef, defPierce, dmgReduce, teamDefReduce, trueDamage, accuracy, evasion, absDef, dominant };
}

// A가 B에게 실제로 넣는 유효 DPS (방어감쇠·절대공격·회피·상성·받는피해감소·절대방어 반영).
function effDPSbetween(atk, def) {
  const mitig = mitigation(def.avgDef * (1 - atk.defPierce));
  const throughput = mitig + atk.trueDamage * (1 - mitig);
  const enemyEva = Math.min(0.5, Math.max(0, def.evasion - atk.accuracy));
  const aff = affinity(atk.dominant, def.dominant);
  const incoming = (1 - def.teamDefReduce) * (1 - def.dmgReduce) * (1 - def.absDef);
  return Math.max(1, atk.baseDPS * throughput * (1 - enemyEva) * aff * incoming);
}

export function resolvePvP(attacker, defender, aMods = {}, dMods = {}, aForm = null, dForm = null) {
  if (!attacker || !attacker.length) return { win: false, margin: 0, log: '공격 파티 없음' };
  if (!defender || !defender.length) return { win: true, margin: Infinity, log: '방어 파티 없음' };
  const A = aggregateSide(attacker, aMods, aForm);
  const D = aggregateSide(defender, dMods, dForm);
  const aEff = effDPSbetween(A, D); // 공격자가 방어자에게
  const dEff = effDPSbetween(D, A); // 방어자가 공격자에게
  const ta = D.ehp / aEff; // 공격자가 방어자를 처치하는 시간
  const td = A.ehp / dEff; // 방어자가 공격자를 처치하는 시간
  const win = ta <= td;    // 동률은 선공(공격자) 승
  return {
    win, margin: td / ta,
    attackerPower: Math.round(A.baseDPS), defenderPower: Math.round(D.baseDPS),
    ta, td,
    log: win ? `공격 승리 (${ta.toFixed(1)}초)` : `방어 성공 (${td.toFixed(1)}초)`,
  };
}
