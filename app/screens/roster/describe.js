// 로스터 표시용 순수 헬퍼 — 스탯·스킬·장비·룬 설명 문구 생성 + 표시 상수.
// RosterScreen에서 분리(동작 불변). 상태 없음: 입력→문자열/JSX 출력만.
import React from 'react';
import { Text } from 'react-native';
import { T } from '../../theme';
import { fmt } from '../../components';
import { SKILL_CATALOG } from '../../../system/core/skills.mjs';
import { SLOT_META, gearContribution } from '../../../system/core/gear.mjs';
import { RUNE_SETS, RUNE_RARITY, runeMainValue } from '../../../system/core/runes.mjs';
import { elementMeta } from '../../../system/concepts/index.mjs';
import { SOURCE_LABEL } from '../../../system/core/costumes.mjs';

// 전후 차이 표시 — 델타를 '채운 배지'로 강조(하향=빨강 배지+흰 글자, 상향=초록 배지).
export function DeltaText({ cur, next }) {
  const d = next - cur;
  const up = d > 0, down = d < 0;
  const badge = {
    backgroundColor: up ? T.good : down ? T.danger : T.surface2,
    color: up ? '#0f2a17' : down ? '#ffffff' : T.muted,
    fontWeight: '900', fontSize: 12, borderRadius: 5, overflow: 'hidden',
  };
  return (
    <Text style={{ color: T.muted, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
      전투력 {fmt(cur)} → <Text style={{ color: up ? T.good : down ? T.danger : T.text, fontWeight: '900' }}>{fmt(next)}</Text>
      {'  '}<Text style={badge}> {up ? '▲ +' : down ? '▼ -' : '± '}{fmt(Math.abs(d))} </Text>
    </Text>
  );
}

// 장비 계열 그룹핑(표시 순서·소제목).
export const SLOT_KO = Object.fromEntries(Object.entries(SLOT_META).map(([k, v]) => [k, v.label]));
export const GEAR_CATS = [
  { cat: 'weapon', label: '무기' },
  { cat: 'armor', label: '방어구' },
  { cat: 'accessory', label: '장신구' },
  { cat: 'mount', label: '탈것' },
];

// 코스튬 미보유 시 획득 조건 안내.
export function costumeNeedText(cos, concept) {
  const n = cos.need || {};
  if (cos.source === 'summon') return '코스튬 소환으로 획득';
  if (cos.source === 'quest') return `스토리 ${n.campaign}챕터 클리어`;
  if (cos.source === 'vip') return `과금 등급 VIP ${n.vip}`;
  if (cos.source === 'power') return `영웅 전투력 ${fmt(n.power)}`;
  if (cos.source === 'element') {
    const em = elementMeta(concept, n.element);
    return `${em?.emoji || ''}${em?.name || n.element} 속성 전투력 ${fmt(n.power)}`;
  }
  return SOURCE_LABEL[cos.source] || cos.source;
}

// 스탯 → 아이콘(룬·장비·스킬 표기 일관). 이름 대신 아이콘으로 간결·시각화.
export const STAT_ICON = {
  atk: '⚔️', hp: '❤️', def: '🛡️', spd: '👟',
  critChance: '💥', critDamage: '💥💥', lifesteal: '🩸', defPierce: '🏹',
  dmgReduce: '🧱', evasion: '🌀', accuracy: '🎯', trueDamage: '⚡', absDef: '🔰',
};
export function statIcon(key) { return STAT_ICON[key] || String(key).toUpperCase(); }
// 치명피해(💥💥)만 겹쳐 보이도록 음수 자간 적용 — 문자열을 Text 자식 배열로 변환.
//   critDamage가 없으면 원문 문자열 그대로 반환(오버헤드 0).
export function ov(text) {
  const s = String(text);
  if (!s.includes('💥💥')) return s;
  const segs = s.split('💥💥');
  const out = [];
  segs.forEach((seg, i) => {
    if (seg) out.push(seg);
    if (i < segs.length - 1) out.push(<Text key={`cd${i}`} style={{ letterSpacing: -10 }}>💥💥</Text>);
  });
  return out;
}

// 효과 객체 → 사람이 읽는 문자열 (scale = 스킬 레벨/랭크 배수)
export function describeEffect(e = {}, scale = 1) {
  const p = [];
  const order = ['critChance', 'critDamage', 'lifesteal', 'defPierce', 'dmgReduce', 'evasion', 'accuracy', 'trueDamage', 'absDef'];
  for (const k of order) if (e[k]) p.push(`${statIcon(k)} +${Math.round(e[k] * scale * 100)}%`);
  return p;
}
// scale: 스킬 레벨/랭크 배수. 강화 시 실제 반영되는 수치를 그대로 보여준다.
export function describeSkill(id, scale = 1) {
  const s = SKILL_CATALOG[id];
  const p = [];
  if (s.statPct) for (const [k, v] of Object.entries(s.statPct)) p.push(`${statIcon(k)} +${Math.round(v * scale * 100)}%`);
  p.push(...describeEffect(s.effect, scale));
  p.push(...describeTeamBuff(s.teamBuff, scale));
  return p.join(' · ');
}
// 팀버프 3종 표시 (공격/피해경감/치명)
export function describeTeamBuff(tb = {}, scale = 1) {
  const p = [];
  if (tb.atk) p.push(`팀 ⚔️ +${Math.round(tb.atk * scale * 100)}%`);
  if (tb.def) p.push(`팀 🛡️ +${Math.round(tb.def * scale * 100)}%`);
  if (tb.critChance) p.push(`팀 🎯 +${Math.round(tb.critChance * scale * 100)}%`);
  return p;
}
// 설계도 기준(강화 전 Lv1) 표시 — 제작 미리보기용.
export function describeGear(bp) {
  const p = [];
  for (const [k, v] of Object.entries(bp.flat || {})) p.push(`${statIcon(k)} +${v}`);
  p.push(...describeEffect(bp.effect));
  return p.join(' · ');
}
// 실제 장비 인스턴스(강화 레벨 + 등급 배수 + 부옵션 반영) 표시.
export function describeGearItem(item) {
  const c = gearContribution(item);
  const p = [];
  for (const [k, v] of Object.entries(c.flat)) p.push(`${statIcon(k)} +${Math.round(v)}`);
  for (const [k, v] of Object.entries(c.statPct)) p.push(`${statIcon(k)} +${Math.round(v * 100)}%`);
  p.push(...describeEffect(c.effect));
  return p.join(' · ');
}
// 장비 부옵션만 (재련 대상 강조용).
export function describeSubs(subs = []) {
  return subs.map((s) => `${statIcon(s.key)} +${Math.round(s.value * 100)}%`).join(' · ');
}
// 시그니처 각성 2차 효과 설명
export function describeAwaken(a = {}) {
  const p = [];
  if (a.statPct) for (const [k, v] of Object.entries(a.statPct)) p.push(`${statIcon(k)} +${Math.round(v * 100)}%`);
  p.push(...describeEffect(a.effect));
  p.push(...describeTeamBuff(a.teamBuff));
  return p.join(' · ');
}
// 룬 한 개 요약 (메인스탯 + 등급 + 부옵션)
export function describeRune(rune) {
  const set = RUNE_SETS[rune.set];
  const val = runeMainValue(rune);
  const stat = statIcon(set.main.stat);
  const pct = `${(val * 100).toFixed(1)}%`;
  const subTxt = (rune.subs || []).length ? ` · ${describeSubs(rune.subs)}` : '';
  return { title: `${set.emoji} ${set.label} +${rune.level}`, sub: `${stat} ${pct}${subTxt}`, rarity: rune.rarity, rarityLabel: RUNE_RARITY[rune.rarity].label };
}

// 영웅 탭 최상위 서브탭 — 영웅(그리드+상세) · 편성(파티·진형) · 성장(펫·유물·엠블럼·정령).
export const ROSTER_TABS = [
  { key: 'heroes', label: '영웅', icon: '🦸' },
  { key: 'party', label: '편성', icon: '⚔️' },
  { key: 'growth', label: '성장', icon: '🌱' },
  { key: 'meta', label: '기록', icon: '📖' },
];

// 캐릭터 상세 서브탭 — 9개 세로 스택을 목적별 4묶음으로.
//   성장: 친밀도·씨앗·성장(레벨/돌파/각인) · 장비: 룬·전용무기·장비
//   스킬: 전용스킬·스킬편성 · 꾸미기: 코스튬
export const DETAIL_TABS = [
  { key: 'growth', label: '육성', icon: '📈' },
  { key: 'gear', label: '장비', icon: '⚔️' },
  { key: 'skill', label: '스킬', icon: '✨' },
  { key: 'cosmetic', label: '꾸미기', icon: '🎭' },
];
