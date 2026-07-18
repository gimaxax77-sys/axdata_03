import React, { useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T, rarityMeta, SPACE } from './theme';
import { fx } from './feedback';
import { reducedMotion } from './motion';
import { isOn } from '../system/core/features.mjs';
import { resIcon } from './uiIcons';

// ── 캐릭터 초상 — 등급 프레임 + 글로우. 로스터/파티/소환/도감 공용 ──
//   image(있으면): 캐릭터 일러스트를 프레임 안에 렌더. 없으면 emoji 폴백.
//   React.memo — 방치 틱(초당 리렌더)에서 그라데이션 재계산을 건너뛴다.
export const Portrait = React.memo(function Portrait({ emoji, image = null, rarity = 'N', size = 56, badge = false, glow = true, dim = false, style }) {
  // 등급 모듈 off면 등급 무관(중립 'N' 프레임 · 글로우/배지 없음).
  const showRarity = isOn('rarity');
  const effRarity = showRarity ? rarity : 'N';
  const rm = rarityMeta(effRarity);
  const radius = size * 0.26;
  const ring = Math.max(2, size * 0.045);
  const innerR = radius - ring;
  return (
    <View style={[glow && { shadowColor: rm.color, shadowOpacity: effRarity === 'N' ? 0 : 0.9, shadowRadius: size * 0.16, shadowOffset: { width: 0, height: 0 } }, style]}>
      <LinearGradient colors={rm.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: radius, padding: ring, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={[T.surface2, T.surface]} style={{ width: '100%', height: '100%', borderRadius: innerR, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {image
            ? <Image source={image} style={{ width: '100%', height: '100%', opacity: dim ? 0.4 : 1 }} resizeMode="cover" />
            : <Text style={{ fontSize: size * 0.5, opacity: dim ? 0.4 : 1 }}>{emoji}</Text>}
        </LinearGradient>
      </LinearGradient>
      {badge && showRarity && (
        // 등급 배지 — 초상 크기에 비례해 렌더(화면마다 초상 크기가 달라도
        // 배지 비율은 일관). 등급 글자수(N~SSR)와 무관하게 동일 규격.
        <View style={{
          position: 'absolute', bottom: -size * 0.10, alignSelf: 'center', left: 0, right: 0,
          marginHorizontal: 'auto', width: size * 0.62, paddingVertical: size * 0.02,
          borderRadius: size * 0.15, alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', backgroundColor: rm.color,
        }}>
          <Text style={{ color: '#1a1225', fontSize: size * 0.22, fontWeight: '900', letterSpacing: 0.2 }}>{rarity}</Text>
        </View>
      )}
    </View>
  );
});

// ── 성급(Star Grade) 배지 — 별 하나를 5조각(뾰족점)으로 채운다.
//   · 구간: 1~5성=은빛 · 6~10성=금빛 (색으로 구간 즉시 구분)
//   · 세부: 성급만큼 조각이 켜짐 — 1/6성=1조각 … 5/10성=5조각(별 완성)
//   빈 조각·채운 조각은 같은 계열 투톤(어두운/밝은)으로 조화. 조각은
//   중심에서 정확히 맞물려 반대쪽으로 삐져나오지 않는다.
//   회전 이펙트 없음. 등급 상승 시 팝 연출만(reducedMotion 존중).
const STAR_BANDS = {
  silver: { fill: '#e9eefb', dim: '#5b6488', glow: '#cdd6ef' },
  gold: { fill: '#ffd257', dim: '#8a7135', glow: '#ffe27a' },
};
export const StarBadge = React.memo(function StarBadge({ tier = 1, size = 40 }) {
  const clamped = Math.max(1, Math.min(10, tier));
  const band = clamped >= 6 ? STAR_BANDS.gold : STAR_BANDS.silver;
  const pieces = ((clamped - 1) % 5) + 1; // 켜진 조각 수 1~5
  const t = (clamped - 1) / 9; // 0~1 (글로우 강도 보간)
  const reduce = reducedMotion();
  const pop = useRef(new Animated.Value(reduce ? 1 : 0.7)).current;

  useEffect(() => {
    if (reduce) { pop.setValue(1); return; }
    pop.setValue(0.75);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }).start();
  }, [clamped]);

  const haloOpacity = 0.06 + t * 0.20;
  const haloScale = 1 + t * 0.24;
  const c = size / 2;

  // 별 뾰족점 — 위/아래 삼각을 붙인 마름모. 바깥 꼭짓점 → 중앙 최대폭 → 정확히 중심.
  //   안쪽 꼭짓점을 중심(c)에 딱 맞춰, 켜진 조각이 반대쪽으로 넘어가지 않게 함.
  const outerY = c - size * 0.47;   // 바깥 꼭짓점(별 끝)
  const innerY = c;                 // 안쪽 꼭짓점 = 정중앙(삐져나옴 방지)
  const midY = c - size * 0.17;     // 최대폭(별 몸통 = 안쪽 오각형 꼭짓점)
  const dw = size * 0.135;          // 마름모 반폭
  const rhombus = (idx, color, big) => (
    <View key={`${big ? 'g' : 'd'}${idx}`} style={{
      position: 'absolute', width: size, height: size,
      transform: [{ rotate: `${idx * 72}deg` }],
    }}>
      <View style={{
        position: 'absolute', left: c - dw, top: outerY,
        width: 0, height: 0,
        borderLeftWidth: dw, borderRightWidth: dw, borderBottomWidth: midY - outerY,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
      }} />
      <View style={{
        position: 'absolute', left: c - dw, top: midY,
        width: 0, height: 0,
        borderLeftWidth: dw, borderRightWidth: dw, borderTopWidth: innerY - midY,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
      }} />
    </View>
  );

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 글로우 후광 — 등급이 오를수록 커지고 진해짐 */}
      <View style={{
        position: 'absolute', width: size * haloScale, height: size * haloScale,
        borderRadius: size, backgroundColor: band.glow, opacity: haloOpacity,
      }} />
      <Animated.View style={{ width: size, height: size, transform: [{ scale: pop }] }}>
        {/* 1) 5조각 전부 어둡게(빈 별 = 투톤의 어두운 톤) */}
        {[0, 1, 2, 3, 4].map((i) => rhombus(i, band.dim, false))}
        {/* 2) 켜진 조각만 밝은 톤으로 덮어쓰기 */}
        {[0, 1, 2, 3, 4].filter((i) => i < pieces).map((i) => rhombus(i, band.fill, true))}
      </Animated.View>
    </View>
  );
});

// ── 전투력 칩 — 큰 배너가 아니라 이름 옆 빈 공간에 얹는 얇은 플로팅 칩.
//   골드 그라데이션 + 은은한 글로우로 존재감은 유지하되 자리는 작게 차지.
//   값이 오르면(레벨업·장착·성급 등) 살짝 튀며 번쩍(획득 강조, ResCell과 동일 규약).
//   onPress를 주면 눌러서 펼치는 토글(전투력 분해 표)로도 쓸 수 있다.
export const PowerBadge = React.memo(function PowerBadge({ power, onPress, expanded }) {
  const prev = useRef(power);
  const scale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (power > prev.current) {
      scale.setValue(1); flash.setValue(1);
      // 같은 노드에 scale(transform)과 flash(shadowRadius)를 함께 애니 → 드라이버 통일 필수.
      // shadowRadius는 네이티브 드라이버 불가이므로 둘 다 JS(useNativeDriver:false)로 맞춘다.
      // (섞으면 네이티브에서 "moved to native earlier" 크래시.)
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.08, useNativeDriver: false, speed: 30, bounciness: 10 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: false, speed: 16, bounciness: 6 }),
        ]),
        Animated.timing(flash, { toValue: 0, duration: 750, useNativeDriver: false }),
      ]).start();
    }
    prev.current = power;
  }, [power]);
  const glowRadius = flash.interpolate({ inputRange: [0, 1], outputRange: [3, 10] });
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap activeOpacity={0.8} onPress={onPress} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
      <Animated.View style={[pb.shadowWrap, { transform: [{ scale }], shadowRadius: glowRadius }]}>
        <LinearGradient colors={T.accentGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pb.pill}>
          <Text style={pb.icon}>⚔️</Text>
          <Text style={pb.val}>{fmt(power)}</Text>
          {onPress && <Text style={pb.chev}>{expanded ? '▲' : '▼'}</Text>}
        </LinearGradient>
      </Animated.View>
    </Wrap>
  );
});
const pb = StyleSheet.create({
  shadowWrap: { borderRadius: 10, shadowColor: T.accent, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  icon: { fontSize: 11 },
  val: { color: '#241a40', fontSize: 13, fontWeight: '900' },
  chev: { color: '#241a40', fontSize: 9, fontWeight: '900', opacity: 0.6, marginLeft: 1 },
});

// 자원 셀 — 값이 늘면 살짝 튀며 금색으로 번쩍(획득 강조).
//   방치 골드는 초당 흐르므로 강조 제외. 유의미한 재화(소환권·다이아)만 pulse.
function ResCell({ emoji, value, pulse, iconKey }) {
  const icon = resIcon(iconKey);
  const prev = useRef(value);
  const scale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (pulse && value > prev.current) {
      scale.setValue(1); flash.setValue(1);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, speed: 40, bounciness: 14 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
        ]),
        Animated.timing(flash, { toValue: 0, duration: 650, useNativeDriver: false }),
      ]).start();
    }
    prev.current = value;
  }, [value]);
  const color = pulse
    ? flash.interpolate({ inputRange: [0, 1], outputRange: [T.text, T.accent] })
    : T.text;
  return (
    <Animated.View style={[s.rescell, { transform: [{ scale }] }]}>
      {icon ? <Image source={icon} style={s.resIcon} resizeMode="contain" /> : <Text style={s.resEmoji}>{emoji}</Text>}
      <Animated.Text style={[s.resVal, { color }]}>{fmt(value)}</Animated.Text>
    </Animated.View>
  );
}

// 상단 자원 바 — 유리질 pill
export function ResourceBar({ concept, wallet }) {
  const keys = ['currency', 'growth', 'summon', 'gem'];
  return (
    <LinearGradient colors={T.surfaceGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.resbar}>
      {keys.map((k) => (
        <ResCell key={k} iconKey={k} emoji={concept.resources[k].emoji} value={wallet[k] || 0}
          pulse={k === 'summon' || k === 'gem'} />
      ))}
    </LinearGradient>
  );
}

// 버튼 — gold/primary는 그라데이션, ghost는 외곽선.
// sfx: 누를 때 재생할 피드백 이름(기본 'tap', false면 무음 — 화면에서 직접 재생할 때).
export function Btn({ label, onPress, disabled, kind = 'primary', small, tiny, sfx = 'tap' }) {
  const press = onPress ? (e) => { if (sfx) fx(sfx); onPress(e); } : onPress;
  const grad = kind === 'gold' ? T.accentGrad : T.primaryGrad;
  const fg = kind === 'gold' ? '#3a2a05' : '#fff';
  const textStyle = [s.btnText, small && s.btnTextSmall, tiny && s.btnTextTiny];
  const sizeStyle = [small && s.btnSmall, tiny && s.btnTiny];
  const a11y = typeof label === 'string' ? label : undefined;
  if (kind === 'ghost' || disabled) {
    return (
      <TouchableOpacity style={[s.btn, sizeStyle, kind === 'ghost' ? s.btnGhost : s.btnDisabled]}
        onPress={press} disabled={disabled} activeOpacity={0.75}
        accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: !!disabled }}>
        <Text style={[textStyle, { color: disabled ? T.muted : T.text }]} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
    );
  }
  const glow = kind === 'gold' ? (small ? s.glowGoldSmall : s.glowGold) : (small ? s.glowPrimarySmall : s.glowPrimary);
  return (
    <TouchableOpacity onPress={press} disabled={disabled} activeOpacity={0.82}
      accessibilityRole="button" accessibilityLabel={a11y}
      style={[{ borderRadius: small ? 9 : 12 }, glow]}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[s.btn, sizeStyle]}>
        <Text style={[textStyle, { color: kind === 'ghost' ? T.text : fg }]} numberOfLines={1}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function Card({ children, style }) {
  return (
    <View style={[s.card, style]}>
      <LinearGradient colors={T.surfaceGrad} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: (style && flattenRadius(style)) || 16 }]} pointerEvents="none" />
      {children}
    </View>
  );
}
function flattenRadius(style) {
  const arr = Array.isArray(style) ? style : [style];
  for (const x of arr) { if (x && x.borderRadius != null) return x.borderRadius; }
  return null;
}

// 잠긴 콘텐츠 안내 패널
export function LockedPanel({ title, stage, desc }) {
  return (
    <View style={s.locked}>
      <Text style={s.lockedIcon}>🔒</Text>
      <Text style={s.lockedTitle}>{title} 잠김</Text>
      <Text style={s.lockedStage}>스테이지 {stage} 도달 시 해금</Text>
      {desc ? <Text style={s.lockedDesc}>{desc}</Text> : null}
    </View>
  );
}

// 배수 선택 토글 (×1 / ×10 / ×100 / Max). value/onChange 로 제어.
export function MultiToggle({ value, onChange, options = [1, 10, 100, 'Max'] }) {
  return (
    <View style={s.multi}>
      {options.map((n) => {
        const on = n === value;
        return (
          <TouchableOpacity key={n} style={[s.multiCell, on && s.multiOn]} activeOpacity={0.8}
            onPress={() => onChange(n)}>
            <Text style={[s.multiText, on && s.multiTextOn]}>{multLabel(n)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// 배수 라벨 — 'Max'는 그대로, 숫자는 ×N.
export function multLabel(n) {
  return n === 'Max' ? 'Max' : `×${n}`;
}

// 액션 fn 을 최대 n회 반복 실행. { ok:false } 를 받으면 중단.
// n='Max'(또는 Infinity)이면 재화·상한이 다할 때까지 반복(안전 상한 9999).
export function repeat(fn, n) {
  const cap = n === 'Max' || n === Infinity ? 9999 : n;
  let done = 0;
  for (let i = 0; i < cap; i++) {
    const r = fn();
    if (r && r.ok === false) break;
    done += 1;
  }
  return done;
}

// 퍼센트 너비 안전화 — 0~100 클램프 + 비유한값(NaN/Infinity)은 0.
//   네이티브(Yoga)는 width:"NaN%" 에서 크래시(웹은 무시) → 진행바 너비는 반드시 이걸 통과.
export function pctW(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}

// 큰 수 접미사 — K/M/B/T/Q 이후 AA·AB···ZZ 로 확장(×1000 단위).
//   1000^5=Q 다음부터 두 글자(AA=1000^6 …). ZZ까지 → 사실상 상한 없음(1e2000+).
const FMT_SUFFIX = (() => {
  const s = ['', 'K', 'M', 'B', 'T', 'Q'];
  for (let a = 0; a < 26; a++) for (let b = 0; b < 26; b++) s.push(String.fromCharCode(65 + a) + String.fromCharCode(65 + b));
  return s;
})();
export function fmt(n) {
  n = Math.round(n);
  const neg = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1e4) return neg + n.toLocaleString();
  // ×1000 단위로 나눠 접미사 선택(부동소수 안전: 반복 나눗셈).
  let tier = 0, v = n;
  while (v >= 1000 && tier < FMT_SUFFIX.length - 1) { v /= 1000; tier++; }
  return neg + v.toFixed(1) + FMT_SUFFIX[tier];
}


// ── 등급 배지(RarityTag) — 다크 배경 위 색텍스트는 대비가 약해, 등급색을
//   '채운 알약'으로 표기해 시인성을 확보한다. 로스터/장비/룬/펫 등 공용.
//   label=true면 한글 라벨(레어/에픽…), 아니면 약칭(R/SR…).
export function RarityTag({ rarity = 'N', label = false, style }) {
  const rm = rarityMeta(rarity);
  return (
    <View style={[bs.rtag, { backgroundColor: rm.color }, style]}>
      <Text style={bs.rtagText}>{label ? rm.label : rarity}</Text>
    </View>
  );
}
const bs = StyleSheet.create({
  rtag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, alignSelf: 'center' },
  rtagText: { color: '#160f28', fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
});

const s = StyleSheet.create({
  resbar: { flexDirection: 'row', borderRadius: 14, padding: 6, gap: 6, borderWidth: 1, borderColor: T.line },
  rescell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  resEmoji: { fontSize: 16 },
  resIcon: { width: 22, height: 22 },
  resVal: { color: T.text, fontWeight: '800', fontSize: 15 },
  // 미니멀 정리: small 버튼이 라벨 대비 과하게 커 보이던 걸 축소
  // (paddingVertical 8→5, horizontal 12→10, 글로우도 함께 옅게).
  btn: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9 },
  // 5개 이상 좁은 탭 카드용(레벨업 x1/x10/x100/Max·돌파) — small보다 더 컴팩트.
  btnTiny: { paddingVertical: 5, paddingHorizontal: 3, borderRadius: 8 },
  btnGhost: { borderWidth: 1, borderColor: T.line, backgroundColor: 'rgba(255,255,255,0.03)' },
  btnDisabled: { backgroundColor: T.line, opacity: 0.6 },
  btnText: { fontWeight: '800', fontSize: 14 },
  btnTextSmall: { fontSize: 12 },
  btnTextTiny: { fontSize: 11 },
  glowGold: { shadowColor: T.accent, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  glowPrimary: { shadowColor: T.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  glowGoldSmall: { shadowColor: T.accent, shadowOpacity: 0.28, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  glowPrimarySmall: { shadowColor: T.primary, shadowOpacity: 0.24, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  // 미니멀 정리 1단계: 패딩 16→12(SPACE.md), 그림자를 옅게(카드가 덜 "떠 보이게").
  card: { borderRadius: 16, padding: SPACE.md, borderWidth: 1, borderColor: T.line, overflow: 'hidden', backgroundColor: T.surface, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  // 내용 크기로 컴팩트하게 — 셀에 flex:1이면 네이티브에서 부모 폭 전체로 늘어남(웹과 차이).
  multi: { flexDirection: 'row', backgroundColor: T.surface2, borderRadius: 10, padding: 3, gap: 3 },
  multiCell: { minWidth: 40, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  multiOn: { backgroundColor: T.primary },
  multiText: { color: T.muted, fontWeight: '800', fontSize: 13 },
  multiTextOn: { color: '#fff' },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockedIcon: { fontSize: 56, marginBottom: 12, opacity: 0.8 },
  lockedTitle: { color: T.text, fontWeight: '900', fontSize: 22 },
  lockedStage: { color: T.accent, fontWeight: '700', fontSize: 15, marginTop: 8 },
  lockedDesc: { color: T.muted, fontSize: 13, marginTop: 10, textAlign: 'center', lineHeight: 19 },
});
