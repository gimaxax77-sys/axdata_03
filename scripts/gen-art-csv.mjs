import fs from 'fs';
import { fantasyConcept } from '/home/user/axdata_01/system/concepts/fantasy.mjs';
import { GEAR_CATALOG } from '/home/user/axdata_01/system/core/gear.mjs';
import { SKILL_CATALOG } from '/home/user/axdata_01/system/core/skills.mjs';
import { PETS } from '/home/user/axdata_01/system/core/pets.mjs';
import { RELICS } from '/home/user/axdata_01/system/core/relics.mjs';
import { EMBLEMS } from '/home/user/axdata_01/system/core/emblems.mjs';
import { GUARDIANS } from '/home/user/axdata_01/system/core/guardians.mjs';
import { COSTUMES } from '/home/user/axdata_01/system/core/costumes.mjs';
import * as runes from '/home/user/axdata_01/system/core/runes.mjs';
import * as cosmetics from '/home/user/axdata_01/system/core/cosmetics.mjs';

const rows = [];
const H = ['분류', '세부타입', 'ID', '이름', '규격', '현재상태', '파일경로/키', '우선순위', '비고'];
const add = (r) => rows.push(r);

// 무기 라벨 → 실루엣 타입
function weaponType(label) {
  if (/단검|비수/.test(label)) return '단검';        // '검' 보다 먼저
  if (/방패|실드|방벽|수호벽/.test(label)) return '방패';
  if (/궁|활/.test(label)) return '활';
  if (/도끼/.test(label)) return '도끼';
  if (/창|랜스|스피어/.test(label)) return '창';
  if (/완드|지팡이/.test(label)) return '완드';
  if (/비전서|마도서|스태프|톰/.test(label)) return '스태프';
  if (/검|블레이드|칼/.test(label)) return '검';
  return '기타';
}
// 스킬 효과 계열
function skillFamily(s) {
  const sp = s.statPct || {}, ef = s.effect || {}, tb = s.teamBuff || {};
  const fam = [];
  if (Object.keys(tb).length) fam.push('팀버프');
  if (ef.critChance || ef.critDamage) fam.push('치명타');
  if (ef.lifesteal) fam.push('흡혈');
  if (ef.defPierce || ef.trueDamage) fam.push('관통');
  if (sp.atk) fam.push('공격');
  if (sp.hp || sp.def) fam.push('방어');
  if (sp.spd) fam.push('속도');
  if (!fam.length) fam.push('기타');
  return fam.join('/');
}

// 등록된 초상 = assets/char/fantasy/<id>.png 존재 여부
const portraitDir = '/home/user/axdata_01/assets/char/fantasy/';
const havePng = new Set(fs.existsSync(portraitDir) ? fs.readdirSync(portraitDir).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', '')) : []);

// ── 1) 캐릭터 초상 ──
for (const ch of fantasyConcept.roster) {
  const registered = havePng.has(ch.id);
  add(['캐릭터', '초상', ch.id, ch.name || ch.id, '512x512 PNG', registered ? '등록됨' : '필요', `assets/char/fantasy/${ch.id}.png`, 'P1', ch.title || '']);
}
// ── 2) 캐릭터 전투 스프라이트 (상태 4종) ──
for (const ch of fantasyConcept.roster) {
  add(['캐릭터', '스프라이트', ch.id, ch.name || ch.id, '128x128 가로스트립', '없음', `assets/units/fantasy/${ch.id}/`, 'P5', 'idle/attack/hit/death 4상태']);
}

// ── 3) 장비 ──
for (const g of Object.values(GEAR_CATALOG)) {
  const isWeapon = g.slot === 'weapon' || g.slot === 'offhand';
  const sub = isWeapon ? `무기:${weaponType(g.label)}` : `방어구/장신구:${g.slot}`;
  add(['장비', sub, g.id, g.label, '128x128 PNG', '이모지', '', 'P4', g.set ? `세트:${g.set}` : '']);
}

// ── 4) 스킬 ──
for (const s of Object.values(SKILL_CATALOG)) {
  add(['스킬', skillFamily(s), s.id, s.label, '128x128 원형', '이모지', '', 'P4', s.desc || '']);
}

// ── 5) 기타 아이템 카탈로그 ──
function dumpCatalog(catObj, category, spec, prio) {
  for (const it of Object.values(catObj)) {
    if (!it || typeof it !== 'object' || !it.id) continue;
    add([category, it.tier || it.rarity || '', it.id, it.label || it.name || it.id, spec, '이모지', '', prio, it.desc || '']);
  }
}
dumpCatalog(PETS, '펫', '128x128 초상', 'P4');
dumpCatalog(RELICS, '유물', '128x128', 'P4');
dumpCatalog(EMBLEMS, '엠블럼', '128x128 문장', 'P4');
dumpCatalog(GUARDIANS, '정령/가디언', '128x128 초상', 'P4');
dumpCatalog(COSTUMES, '코스튬', '초상 변형', 'P4');
// 룬·프로필(코스메틱)은 export가 세트/배열 형태 — 있으면 덤프
for (const [k, v] of Object.entries(runes)) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const it of Object.values(v)) if (it && it.id && it.label) add(['룬', k, it.id, it.label, '128x128', '이모지', '', 'P4', it.desc || '']);
  }
}
for (const [k, v] of Object.entries(cosmetics)) {
  if (Array.isArray(v)) for (const it of v) { if (it && (it.id || it.label)) add(['개성/프로필', k, it.id || '', it.label || it.name || '', '프로필 아이콘', '이모지', '', 'P4', '']); }
  else if (v && typeof v === 'object') for (const it of Object.values(v)) if (it && it.id && it.label) add(['개성/프로필', k, it.id, it.label, '프로필 아이콘', '이모지', '', 'P4', '']);
}

// ── 6) UI 심볼 (고정 세트) ──
const elems = fantasyConcept.elements || {};
for (const [k, v] of Object.entries(elems)) add(['UI심볼', '속성', k, (v && v.name) || k, '128x128', v && v.emoji || '이모지', '', 'P3', '원형 뱃지']);
const arch = fantasyConcept.archetypes || {};
for (const [k, v] of Object.entries(arch)) add(['UI심볼', '직업', k, (v && v.name) || k, '128x128', v && v.emoji || '이모지', '', 'P3', '']);
for (const r of ['N', 'R', 'SR', 'SSR', 'UR']) add(['UI심볼', '등급프레임', r, r + ' 등급', '카드 테두리', '목업', '', 'P2', '9-slice']);
for (const [k, v] of Object.entries(fantasyConcept.resources || {})) add(['UI심볼', '재화', k, (v && v.label) || k, '128x128', v && v.emoji || '', '', 'P3', '자원바']);
for (const [id, nm] of [['normal', '일반'], ['hard', '험난'], ['hell', '지옥'], ['abyss', '나락']]) add(['UI심볼', '난이도', id, nm, '난이도칩', '이모지', '', 'P3', '']);
for (const [id, nm] of [['idle', '전투'], ['roster', '영웅'], ['gacha', '소환'], ['content', '콘텐츠'], ['shop', '상점']]) add(['UI심볼', '메인탭', id, nm, '탭 아이콘', '이모지', '', 'P3', '']);
add(['UI심볼', '성급배지', 'star', '성급(1~10)', '실버/골드 밴드', '코드생성', '', 'P2', '']);

// ── 7) UI 스킨 키트 (화면 껍데기) ── [분류, 세부, ID, 이름, 규격, 현재, 경로, 우선, 비고(9-slice/상태)]
const UI = [
  // A. 공통 프레임
  ['A.공통프레임', 'ui_bg_main', '화면 배경', '1080x1920 PNG', '그라디언트', 'P2', '9-slice:N / 속성 구역 5변주 가능'],
  ['A.공통프레임', 'ui_topbar', '상단 자원바 프레임', '≥720x120 PNG', '플랫', 'P2', '9-slice:Y(좌우) / 세이프존 16px'],
  ['A.공통프레임', 'ui_tabbar', '하단 메인 탭바 배경', '1080x180 PNG', '플랫', 'P2', '9-slice:Y / 5칸'],
  ['A.공통프레임', 'ui_tab_active', '탭 선택 인디케이터', '216x180 PNG', '플랫', 'P2', 'active 글로우'],
  ['A.공통프레임', 'ui_subtab', '서브탭 바(세그먼트)', '≥600x96 PNG', '플랫', 'P2', '9-slice:Y / active·idle 2상태'],
  ['A.공통프레임', 'ui_card', '카드/패널 기본', '≥300x200 PNG', '플랫', 'P2', '9-slice:Y / 테두리 24px'],
  ['A.공통프레임', 'ui_card_hl', '카드 강조', '≥300x200 PNG', '플랫', 'P2', '9-slice:Y / 골드 강조'],
  ['A.공통프레임', 'ui_panel_lock', '잠긴 패널 오버레이', '≥300x200 PNG', '플랫', 'P2', '9-slice:Y / 자물쇠'],
  // B. 버튼·입력
  ['B.버튼입력', 'btn_default', '버튼 기본(normal+pressed)', '≥240x88 PNG', '플랫', 'P2', '9-slice:Y / 2상태'],
  ['B.버튼입력', 'btn_gold', '버튼 골드 강조(normal+pressed)', '≥240x88 PNG', '플랫', 'P2', '9-slice:Y / 2상태'],
  ['B.버튼입력', 'btn_ghost', '버튼 고스트(normal+pressed)', '≥240x88 PNG', '플랫', 'P2', '9-slice:Y / 2상태'],
  ['B.버튼입력', 'btn_small', '소형 버튼(small·tiny)', '≥140x60 PNG', '플랫', 'P2', '9-slice:Y'],
  ['B.버튼입력', 'ui_toggle', '토글 스위치(track+knob)', '92x56 PNG', '플랫', 'P2', 'on/off 2상태'],
  ['B.버튼입력', 'ui_input', '텍스트 입력칸 프레임', '≥300x88 PNG', '플랫', 'P2', '9-slice:Y'],
  ['B.버튼입력', 'ui_segment', '배수 세그먼트(x1/x10/x100/Max)', '≥400x72 PNG', '플랫', 'P2', 'active·idle'],
  // C. 뱃지·칩·게이지
  ['C.뱃지게이지', 'chip_rarity', '등급 태그 칩(N~UR)', '≥120x48 PNG×5', '코드생성', 'P2', '등급별 5색'],
  ['C.뱃지게이지', 'chip_power', '전투력 칩 배경', '≥160x56 PNG', '플랫', 'P2', '9-slice:Y'],
  ['C.뱃지게이지', 'gauge_fill', '진행 게이지(층·EXP·친밀도·씨앗)', '≥400x40 PNG', '플랫', 'P2', '트랙+채움 텍스처 4종'],
  ['C.뱃지게이지', 'glyph_set', '소형 글리프(잠금·체크·화살표·별·＋/－)', '64x64 PNG ×~10', '이모지', 'P3', '단색/2색'],
  // D. 화면별 특수
  ['D.화면특수', 'stage_battle', '전투 무대(3열 진형 배경)', '1080x1920 PNG', '기본', 'P5', '타격 이펙트 별도'],
  ['D.화면특수', 'summon_ritual', '소환진 배경', '1080x1920 PNG', '기본', 'P5', ''],
  ['D.화면특수', 'summon_glow', '소환 결과 등급별 광(N~UR)', '전체화면 오버레이 ×5', '기본', 'P5', '등급 연출'],
  ['D.화면특수', 'card_package', '상점 패키지 카드', '≥500x300 PNG', '플랫', 'P4', '9-slice 부분'],
  ['D.화면특수', 'card_dungeon', '던전 카드', '≥500x220 PNG', '플랫', 'P4', ''],
  ['D.화면특수', 'ui_calendar', '출석 캘린더', '그리드 세트', '플랫', 'P4', '보상 슬롯'],
  ['D.화면특수', 'banner_event', '이벤트 배너', '≥1000x300 PNG', '플랫', 'P4', ''],
  ['D.화면특수', 'detail_fullart', '캐릭터 상세 풀아트 레이아웃', '1080x1920 세트', '목업', 'P2', '배너·스킬슬롯·스탯패널'],
  // E. 모달·연출 / F. 브랜드
  ['E.모달연출', 'modal_bg', '모달 배경(설정/콘솔/팝업)', '≥800x600 PNG', '플랫', 'P2', '9-slice:Y'],
  ['E.모달연출', 'bottomsheet', '강화 바텀시트(그립·핸들)', '1080x1200 PNG', '플랫', 'P2', '상단 그립'],
  ['E.모달연출', 'popup_notice', '공지 팝업 프레임', '≥760x520 PNG', '플랫', 'P2', '9-slice:Y'],
  ['E.모달연출', 'onboarding', '온보딩 일러스트', '1080x1080 ×3~5', '없음', 'P4', '첫 실행'],
  ['F.브랜드', 'app_icon', '앱 아이콘', '1024x1024 PNG', '있음', '완료', ''],
  ['F.브랜드', 'splash', '스플래시', '1284x2778 PNG', '있음', '완료', ''],
  ['F.브랜드', 'logo_title', '로고·타이틀', '벡터/PNG', '없음', 'P4', ''],
  ['F.브랜드', 'loading', '로딩 스피너', '256x256 시퀀스', '기본', 'P4', ''],
];
for (const [sub, id, name, spec, cur, prio, note] of UI) add(['UI스킨', sub, id, name, spec, cur, '', prio, note]);

// ── CSV 쓰기 (BOM + 따옴표 이스케이프) ──
const esc = (s) => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = '﻿' + [H, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
const out = '/home/user/axdata_01/docs/art_assets.csv';
fs.writeFileSync(out, csv);
console.log('전체 행 수:', rows.length, '→', out);

// ── MVP 최소 발주 세트: 우선순위 P1(초상) + P2(UI 키트·프레임) 만 ──
const mvp = rows.filter((r) => r[7] === 'P1' || r[7] === 'P2');
const mvpCsv = '﻿' + [H, ...mvp].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
const outMvp = '/home/user/axdata_01/docs/art_assets_mvp.csv';
fs.writeFileSync(outMvp, mvpCsv);
console.log('MVP(P1+P2) 행 수:', mvp.length, '→', outMvp);

// 분류별 집계
const byCat = {};
for (const r of rows) byCat[r[0]] = (byCat[r[0]] || 0) + 1;
console.log(byCat);
