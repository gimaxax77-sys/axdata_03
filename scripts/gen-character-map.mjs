// 로스터 → KayKit 몸/색 매핑 자동 초안 (Gim이 검토·수정용)
import fs from 'fs';
import { fantasyConcept } from '../system/concepts/fantasy.mjs';

// 원형(archetype) → KayKit 바디. (검토 후 Barbarian/Rogue_Hooded 등으로 다양화 가능)
const BODY = {
  STRIKER: 'Knight',    // 근접 딜러(검사류)
  VANGUARD: 'Knight',   // 탱커(방패)
  SUPPORT: 'Mage',      // 지원/치유/법사
  ROGUE: 'Rogue',       // 도적
  ARCHER: 'Ranger',     // 궁수
  MAGE: 'Mage',
};
// 속성(element) → 리컬러 색상
const COLOR = { FIRE: '빨강', WATER: '파랑', WOOD: '초록', LIGHT: '금/흰', DARK: '보라' };

const H = ['ID', '이름', '칭호', '속성', '원형', '등급', '3D몸(KayKit)', '색상', '비고(수정)'];
const rows = [H];
for (const c of fantasyConcept.roster) {
  rows.push([
    c.id, c.name, c.title || '', c.element || '', c.archetype || '', c.rarity || '',
    BODY[c.archetype] || 'Knight', COLOR[c.element] || '기본', '',
  ]);
}

const esc = (s) => { s = String(s ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
fs.writeFileSync(new URL('../docs/character_map.csv', import.meta.url), csv);

console.log('매핑 초안', rows.length - 1, '명 → docs/character_map.csv');
const byBody = {};
for (const c of fantasyConcept.roster) { const b = BODY[c.archetype] || 'Knight'; byBody[b] = (byBody[b] || 0) + 1; }
console.log('몸별 배정:', byBody);
