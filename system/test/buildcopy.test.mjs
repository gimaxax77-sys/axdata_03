import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../core/gameState.mjs';
import { createUnit } from '../core/units.mjs';
import { setFormation, unitRole } from '../core/formation.mjs';
import { equipSkill } from '../core/character.mjs';
import {
  exportBuild, encodeBuild, decodeBuild, applyBuild, applyBuildCode,
} from '../core/buildcopy.mjs';

function seed() {
  const a = createUnit('STRIKER', { level: 40, rank: 4 });
  const b = createUnit('VANGUARD', { level: 40, rank: 4 });
  const s = createGameState({ units: [a, b], party: [a.uid, b.uid] });
  return { s, a, b };
}

test('덱복사: export → encode → decode 왕복', () => {
  const { s, a } = seed();
  setFormation(s, a.uid, 'back');
  const build = exportBuild(s);
  const code = encodeBuild(build);
  assert.ok(code.startsWith('DECK1:'), '코드 접두어');
  const back = decodeBuild(code);
  assert.deepEqual(back, build, '왕복 무손실');
  assert.equal(back.slots[0].role, 'back', '진형 보존');
});

test('덱복사: 적용 시 진형 재배치', () => {
  const src = seed();
  setFormation(src.s, src.a.uid, 'back'); // 0번 자리 후열
  const build = exportBuild(src.s);
  // 대상 계정: 진형 미설정
  const dst = seed();
  assert.equal(unitRole(dst.s, dst.a.uid), 'front', '적용 전 전열');
  const r = applyBuild(dst.s, build);
  assert.ok(r.ok);
  assert.equal(unitRole(dst.s, dst.a.uid), 'back', '0번 자리 후열로 복사됨');
});

test('덱복사: 잘못된 코드 방어', () => {
  assert.equal(decodeBuild('garbage'), null);
  assert.equal(decodeBuild('DECK1:@@@'), null);
  assert.equal(applyBuildCode(seed().s, 'nope').ok, false);
});

test('덱복사: 유효 스킬은 장착, 알 수 없는 스킬은 건너뜀', () => {
  const { s, a } = seed();
  const build = { v: 1, slots: [{ role: 'front', skills: ['BERSERK', '__NOPE__'] }, { role: 'front', skills: [] }] };
  const r = applyBuild(s, build);
  assert.ok(r.ok, '적용 성공');
  assert.equal(r.skills, 1, '유효 스킬 1개만 장착');
  assert.equal(s.units.find((u) => u.uid === a.uid).skills[0].id, 'BERSERK', '0슬롯 BERSERK');
});
