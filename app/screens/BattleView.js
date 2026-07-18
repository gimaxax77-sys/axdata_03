import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../theme';
import { reducedMotion } from '../motion';
import { unitSprite, hasUnitSprite } from '../unitSprites';
import SpriteAnim from '../SpriteAnim';

// reduce: 설정에서 전달(즉시 반영). 미전달 시 모듈 플래그 폴백.

// ─────────────────────────────────────────────────────────────
// 자동 전투 시각화 — 순수 연출(게임 로직 불변).
// resolve()의 win/margin으로 "얼마나 우세한가"만 받아 페이스를 정한다.
// HP 바 감소 + 공격 러지 + 데미지 숫자로 "돌아가는 전투"를 보여준다.
// 캐릭터: 스프라이트(SpriteAnim, idle 순환 → attack/hit/walk 1회) > 이모지 폴백.
// setInterval + ref 로 가볍게 구동(웹 export에서도 안정).
// ─────────────────────────────────────────────────────────────

const EMPTY_FORMATION = { front: [], mid: [], back: [] };
const FRONT_SIZE = 120;
const BACK_SIZE = 96;

// 스프라이트 파이터 — idle 순환. 토큰 변경 시 해당 1회 모션(attack/hit/walk) 재생 후 idle.
// 동시 발생 시 소스순(attack→hit→walk) 마지막이 우선(피격이 공격을 끊음 = 자연스러움).
// 원본 스프라이트가 오른쪽(적 방향)을 향하므로 반전 없이 그대로 렌더한다.
function SpriteFighter({ cid, ckey, front, attackToken, hitToken, walkToken }) {
  const [st, setSt] = useState('idle');
  const [tok, setTok] = useState(0);
  useEffect(() => { if (attackToken > 0) { setSt('attack'); setTok((v) => v + 1); } }, [attackToken]);
  useEffect(() => { if (hitToken > 0) { setSt('hit'); setTok((v) => v + 1); } }, [hitToken]);
  useEffect(() => { if (walkToken > 0) { setSt('walk'); setTok((v) => v + 1); } }, [walkToken]);
  const spr = unitSprite(cid, ckey, st) || unitSprite(cid, ckey, 'idle');
  const size = front ? FRONT_SIZE : BACK_SIZE;
  const scale = size / spr.frameH;
  return (
    <SpriteAnim
      source={spr.source} frameW={spr.frameW} frameH={spr.frameH} frames={spr.frames}
      state={st} playToken={tok} scale={scale}
      onEnd={() => setSt('idle')}
    />
  );
}

// 적 파이터 — 왼쪽(파티) 향하는 몬스터 스프라이트. idle 순환, 히어로 공격 시 hit 재생.
// 원본이 이미 왼쪽 방향으로 렌더돼 반전 불필요.
const ENEMY_SIZE = 132;
function EnemyFighter({ ekey, hitToken, atkToken }) {
  const [st, setSt] = useState('idle');
  const [tok, setTok] = useState(0);
  useEffect(() => { if (hitToken > 0) { setSt('hit'); setTok((v) => v + 1); } }, [hitToken]);
  useEffect(() => { if (atkToken > 0) { setSt('attack'); setTok((v) => v + 1); } }, [atkToken]);
  const spr = unitSprite('enemy', ekey, st) || unitSprite('enemy', ekey, 'idle');
  const scale = ENEMY_SIZE / spr.frameH;
  return (
    <SpriteAnim source={spr.source} frameW={spr.frameW} frameH={spr.frameH} frames={spr.frames}
      state={st} playToken={tok} scale={scale} onEnd={() => setSt('idle')} />
  );
}

// 편성 한 칸 — 스프라이트, 없으면 이모지. slot이 문자열이면 이모지(하위호환).
function Fighter({ slot, front, attackToken, hitToken, walkToken }) {
  const o = slot && typeof slot === 'object' ? slot : { emoji: slot };
  if (o.cid && o.key && hasUnitSprite(o.cid, o.key)) {
    return <SpriteFighter cid={o.cid} ckey={o.key} front={front} attackToken={attackToken} hitToken={hitToken} walkToken={walkToken} />;
  }
  return <Text style={front ? s.miniEmojiFront : s.miniEmoji}>{o.emoji}</Text>;
}

function BattleView({ party = EMPTY_FORMATION, enemyEmoji = '👹', enemyKey = null, win = true, margin = 1, reduce }) {
  const noMotion = reduce !== undefined ? reduce : reducedMotion();
  const enemyHp = useRef(1);
  const heroHp = useRef(1);
  const [, force] = useState(0);
  const [lunge, setLunge] = useState(false);
  const [atk, setAtk] = useState(0);           // 공격 재생 트리거(스프라이트)
  const [hitTok, setHitTok] = useState(0);     // 파티 피격 재생 트리거
  const [walkTok, setWalkTok] = useState(0);   // 웨이브 전진(걷기) 트리거
  const [enemyAtk, setEnemyAtk] = useState(0); // 적 공격(반격) 재생 트리거
  const [enemyFlash, setEnemyFlash] = useState(false);
  const floats = useRef([]);
  const fid = useRef(0);

  useEffect(() => {
    enemyHp.current = 1; heroHp.current = 1;
    if (noMotion) { enemyHp.current = win ? 0.45 : 0.85; heroHp.current = win ? 0.9 : 0.5; force((v) => v + 1); return; }
    // 우세할수록 적 HP가 빨리 깎임. 열세(패배)면 파티 HP가 위태.
    const enemyDmg = win ? (margin > 2.2 ? 0.30 : margin > 1.4 ? 0.20 : 0.14) : 0.10;
    const heroDmg = win ? 0.05 : 0.16;
    let t = 0;
    const iv = setInterval(() => {
      t += 1;
      // 히어로 공격 (~0.48s)
      if (t % 4 === 0) {
        setLunge(true); setTimeout(() => setLunge(false), 120);
        setAtk((a) => a + 1); // 스프라이트 attack 재생
        setEnemyFlash(true); setTimeout(() => setEnemyFlash(false), 120);
        const crit = Math.random() < 0.28;
        const mul = crit ? 1.9 : 1;
        enemyHp.current -= enemyDmg * mul * (0.85 + Math.random() * 0.3);
        pushFloat(Math.round(enemyDmg * mul * 4200 * (0.85 + Math.random() * 0.3)), 'enemy', crit);
        if (enemyHp.current <= 0) {
          pushFloat('처치!', 'enemy', true, true);
          enemyHp.current = 1; // 다음 웨이브
          setWalkTok((w) => w + 1); // 처치 → 다음 웨이브로 전진(걷기 1회)
        }
      }
      // 적 반격 (~0.72s) — 적 공격 모션 + 파티 피격 모션
      if (t % 6 === 0) {
        pushFloat(Math.round(heroDmg * 3000 * (0.85 + Math.random() * 0.3)), 'hero', false);
        heroHp.current = Math.max(win ? 0.35 : 0.12, heroHp.current - heroDmg);
        setHitTok((h) => h + 1);
        setEnemyAtk((a) => a + 1);
      }
      // 히어로 자연 회복
      heroHp.current = Math.min(1, heroHp.current + 0.012);
      // 데미지 숫자 수명
      floats.current = floats.current.map((f) => ({ ...f, life: f.life - 1 })).filter((f) => f.life > 0);
      force((v) => (v + 1) % 1e6);
    }, 120);
    return () => clearInterval(iv);
  }, [win, margin, noMotion]);

  function pushFloat(val, side, crit, big) {
    fid.current += 1;
    floats.current = [...floats.current.slice(-7), { id: fid.current, val, side, crit, big, life: 9, dx: Math.random() * 26 - 13 }];
  }

  const bar = (ratio, color) => (
    <View style={s.barBg}><View style={[s.barFill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: color }]} /></View>
  );
  const renderFloats = (side) => floats.current.filter((f) => f.side === side).map((f) => (
    <Text key={f.id} style={[
      s.float,
      f.crit && s.floatCrit, f.big && s.floatBig,
      { opacity: f.life / 9, bottom: 90 + (9 - f.life) * 7, left: `${45 + f.dx}%` },
    ]}>{typeof f.val === 'number' ? f.val.toLocaleString() : f.val}</Text>
  ));

  const heroCount = party.front.length + party.mid.length + party.back.length;

  return (
    <View style={s.arena}>
      <View style={s.heroSide}>
        <View style={s.floatLayer}>{renderFloats('hero')}</View>
        {/* 전투 화면은 1·2열(중열→전열)만 표시 — 후열은 숨겨 화면을 정리(전투 로직엔 영향 없음). */}
        <View style={s.formRow}>
          <View style={s.formCol}>
            {party.mid.map((e, i) => <Fighter key={'m' + i} slot={e} front={false} attackToken={atk} hitToken={hitTok} walkToken={walkTok} />)}
          </View>
          <View style={[s.formCol, lunge && s.formColLunge]}>
            {party.front.map((e, i) => <Fighter key={'f' + i} slot={e} front={true} attackToken={atk} hitToken={hitTok} walkToken={walkTok} />)}
          </View>
        </View>
        {bar(heroHp.current, T.good)}
        <Text style={s.label}>내 파티 {heroCount}명</Text>
      </View>
      <Text style={s.clash}>⚔️</Text>
      <View style={s.side}>
        <View style={s.floatLayer}>{renderFloats('enemy')}</View>
        {enemyKey && hasUnitSprite('enemy', enemyKey)
          ? <EnemyFighter ekey={enemyKey} hitToken={atk} atkToken={enemyAtk} />
          : <Text style={[s.emoji, enemyFlash && s.emojiHit]}>{enemyEmoji}</Text>}
        {bar(enemyHp.current, T.danger)}
        <Text style={s.label}>적</Text>
      </View>
    </View>
  );
}

// 방치 틱마다 부모가 리렌더돼도 props(파티·win·margin)가 같으면 건너뛴다.
export default React.memo(BattleView);

const s = StyleSheet.create({
  // 무대를 꽉 채우고 파티·적을 바닥선(flex-end)에 세운다(배경 위에 서 있게).
  arena: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 4, paddingBottom: 6 },
  side: { alignItems: 'center', width: 128, justifyContent: 'flex-end' },
  // 히어로 쪽 — 3열(후열·중열·전열) 편성. 큰 스프라이트에 맞춰 넓게.
  heroSide: { alignItems: 'center', width: 224, justifyContent: 'flex-end' },
  floatLayer: { position: 'absolute', left: 0, right: 0, bottom: 40, height: 180, zIndex: 5 },
  formRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1 },
  formCol: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: -8 },
  formColLunge: { transform: [{ translateX: 8 }] },
  miniEmoji: { fontSize: 34, opacity: 0.85 },
  miniEmojiFront: { fontSize: 46 },
  emoji: { fontSize: 104 },
  emojiHit: { transform: [{ translateX: 6 }], opacity: 0.55 },
  clash: { fontSize: 22, opacity: 0.5, marginBottom: 40 },
  barBg: { width: 110, height: 8, backgroundColor: T.surface, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  label: { color: T.muted, fontSize: 12, marginTop: 4, fontWeight: '700' },
  float: { position: 'absolute', fontSize: 14, fontWeight: '800', color: T.text },
  floatCrit: { fontSize: 18, color: T.accent },
  floatBig: { fontSize: 16, color: T.good },
});
