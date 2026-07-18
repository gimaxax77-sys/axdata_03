import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Animated } from 'react-native';
import { T } from '../theme';
import { Card, Btn, fmt, MultiToggle, repeat } from '../components';
import { CodeTag } from '../uicode';
import { fx } from '../feedback';
import { reducedMotion } from '../motion';
import { SHOP, purchase, adLeft, packageOwned } from '../../system/core/shop.mjs';
import { getStage } from '../../system/core/progression.mjs';
import { purchasePackage } from '../iap';
import { RENTAL_CATALOG, rent, rentalTier, rentalMsLeft } from '../../system/core/rentals.mjs';
import {
  PROFILE_FRAMES, PROFILE_TITLES, getProfile, setProfileName,
  buyCosmetic, equipCosmetic, ownsCosmetic, hasPremium, PROFILE_NAME_MAX,
} from '../../system/core/cosmetics.mjs';

// 남은 대여 기간 → "N일 M시간".
function fmtLeft(ms) {
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}일 ${h % 24}시간`;
  if (h > 0) return `${h}시간`;
  return `${Math.max(1, Math.floor(ms / 60000))}분`;
}

// grant 정의 → 표시용 문자열 (진행도 스케일 반영)
function grantText(state, concept, grant) {
  const st = getStage(state.peakStage).rewards;
  const parts = [];
  for (const [k, v] of Object.entries(grant)) {
    if (k === 'currencyStage') parts.push(`${concept.resources.currency.emoji}${fmt(st.currency * v)}`);
    else if (k === 'growthStage') parts.push(`${concept.resources.growth.emoji}${fmt(st.growth * v)}`);
    else parts.push(`${concept.resources[k]?.emoji || ''}${fmt(v)}`);
  }
  return parts.join('  ');
}

// 상점 서브탭 — 재화(광고·다이아) / 패키지(결제·대여) / 코스튬(개성).
const SUBTABS = [
  { key: 'currency', label: '재화', icon: '💎' },
  { key: 'package', label: '패키지', icon: '🎁' },
  { key: 'cosmetic', label: '코스튬', icon: '🎭' },
];

export default function ShopScreen({ state, bump, concept, onOpenSettings }) {
  const [mult, setMult] = useState(1);
  const [pkgMsg, setPkgMsg] = useState(null);
  const [grp, setGrp] = useState('currency'); // 현재 서브탭
  // 서브탭 전환 시 스크롤 최상단 + "차르륵" 진입 연출(공통 규약).
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false }); }, [grp]);
  const anims = useRef(SUBTABS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reducedMotion()) { anims.forEach((a) => a.setValue(1)); return; }
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(60, anims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
    )).start();
  }, []);
  const buy = (id) => { purchase(state, id); bump(); };
  const buyN = (id) => { repeat(() => purchase(state, id), mult); bump(); };
  // 패키지: 결제 → (설정 시)서버 검증 → 검증 통과(grant) 시에만 지급.
  const buyPackage = async (id) => {
    const r = await purchasePackage(id);
    if (r.grant) purchase(state, id);
    setPkgMsg(r.text || null);
    bump();
  };
  const gem = concept.resources.gem;
  const prof = getProfile(state);
  const [name, setName] = useState(prof.name);
  const buyCos = (kind, id) => { const r = buyCosmetic(state, kind, id); if (r.ok) equipCosmetic(state, kind, id); bump(); };
  const equipCos = (kind, id) => { equipCosmetic(state, kind, id); bump(); };
  const saveName = () => { setProfileName(state, name); bump(); };

  return (
    <View style={s.flex}>
    <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.wrap}>
      {/* 환경 설정 — 상단 헤더에서 이동. 어느 서브탭에서나 접근. */}
      {onOpenSettings && (
        <View style={s.envRow}>
          <CodeTag id="o6" corner="tr" />
          {onOpenSettings && (
            <TouchableOpacity style={s.envBtn} onPress={onOpenSettings} activeOpacity={0.8}
              accessibilityRole="button" accessibilityLabel="설정 열기">
              <Text style={s.envIcon}>⚙️</Text><Text style={s.envLabel}>설정</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 개성 — 프로필 · 코스메틱(순수 외형, 능력치 무관) */}
      {grp === 'cosmetic' && (
      <Card>
        <CodeTag id="o1" corner="tl" />
        <Text style={s.sec}>🎭 개성 <Text style={s.dim}>(외형 전용 · 전투력 무관)</Text></Text>
        <View style={s.profHead}>
          <Text style={s.profFrame}>{(PROFILE_FRAMES[prof.frame] || PROFILE_FRAMES.none).emoji}</Text>
          <View style={{ flex: 1 }}>
            <TextInput style={s.nameInput} value={name} onChangeText={setName}
              maxLength={PROFILE_NAME_MAX} placeholder="닉네임" placeholderTextColor={T.muted}
              onBlur={saveName} onSubmitEditing={saveName} />
            <Text style={s.profTitle}>{(PROFILE_TITLES[prof.title] || PROFILE_TITLES.none).label}
              {prof.premium ? '  ·  ✨광고제거' : ''}</Text>
          </View>
          <Btn small kind="ghost" label="저장" onPress={saveName} />
        </View>

        <Text style={s.subsec}>프로필 테두리</Text>
        <View style={s.cosRow}>
          {Object.values(PROFILE_FRAMES).map((f) => {
            const owned = ownsCosmetic(state, 'frame', f.id);
            const on = prof.frame === f.id;
            return (
              <Btn key={f.id} small kind={on ? 'gold' : owned ? 'primary' : 'ghost'}
                disabled={on}
                label={owned ? `${f.emoji} ${f.label}` : `${f.emoji} ${gem.emoji}${f.cost.gem}`}
                onPress={() => (owned ? equipCos('frame', f.id) : buyCos('frame', f.id))} />
            );
          })}
        </View>

        <Text style={s.subsec}>칭호</Text>
        <View style={s.cosRow}>
          {Object.values(PROFILE_TITLES).map((t) => {
            const owned = ownsCosmetic(state, 'title', t.id);
            const on = prof.title === t.id;
            return (
              <Btn key={t.id} small kind={on ? 'gold' : owned ? 'primary' : 'ghost'}
                disabled={on}
                label={owned ? t.label : `${t.label} ${gem.emoji}${t.cost.gem}`}
                onPress={() => (owned ? equipCos('title', t.id) : buyCos('title', t.id))} />
            );
          })}
        </View>
      </Card>
      )}

      {/* 광고 보상 */}
      {grp === 'currency' && (<>
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="o2" corner="tl" />
        <Text style={s.sec}>📺 광고 보상 <Text style={s.dim}>(무료 · 일일 제한){hasPremium(state) ? ' · ✨패스 보유' : ''}</Text></Text>
        {SHOP.ad.map((p) => {
          const left = adLeft(state, p.id);
          return (
            <View key={p.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{p.label}</Text>
                <Text style={s.reward}>{grantText(state, concept, p.grant)} · 오늘 {left}/{p.limit}</Text>
              </View>
              <Btn small label={left > 0 ? '시청' : '소진'} disabled={left <= 0} onPress={() => buy(p.id)} />
            </View>
          );
        })}
      </Card>

      {/* 다이아 상점 */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="o3" corner="tl" />
        <View style={s.shopHead}>
          <Text style={s.sec}>{gem.emoji} {gem.name} 상점</Text>
          <MultiToggle value={mult} onChange={setMult} />
        </View>
        {SHOP.gem.map((p) => (
          <View key={p.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{p.label}</Text>
              <Text style={s.reward}>{grantText(state, concept, p.grant)}</Text>
            </View>
            <Btn small kind="gold" label={`×${mult} ${gem.emoji}${fmt(p.cost.gem * mult)}`} disabled={(state.wallet.gem || 0) < p.cost.gem}
              onPress={() => buyN(p.id)} />
          </View>
        ))}
      </Card>
      </>)}

      {/* 패키지 (모의 결제) */}
      {grp === 'package' && (<>
      <Card style={{ marginTop: 12, marginBottom: 24 }}>
        <CodeTag id="o4" corner="tl" />
        <Text style={s.sec}>🎁 패키지 <Text style={s.dim}>(결제 → 서버 검증 → 지급)</Text></Text>
        {pkgMsg ? <Text style={s.msg}>{pkgMsg}</Text> : null}
        {SHOP.package.map((p) => {
          const owned = p.once && packageOwned(state, p.id);
          return (
            <View key={p.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>
                  {p.label}
                  {p.tag ? <Text style={s.tag}>  {p.tag}</Text> : null}
                  {p.once ? <Text style={s.dim}>  1회</Text> : null}
                </Text>
                <Text style={s.reward}>{grantText(state, concept, p.grant)}</Text>
                {p.note ? <Text style={s.note}>{p.note}</Text> : null}
              </View>
              <Btn small kind={owned ? 'ghost' : 'primary'} disabled={owned} label={owned ? '구매완료' : p.krw}
                onPress={() => buyPackage(p.id)} />
            </View>
          );
        })}
        <Text style={s.disc}>※ 실제 결제는 연동되지 않은 골격입니다. 버튼은 보상 흐름 시연용(모의 지급).</Text>
      </Card>

      {/* 기간제 대여 (렌트) */}
      <Card style={{ marginTop: 12, marginBottom: 24 }}>
        <CodeTag id="o5" corner="tl" />
        <Text style={s.sec}>⏳ 기간제 대여 <Text style={s.dim}>(상위 성능을 일정 기간 대여)</Text></Text>
        {Object.values(RENTAL_CATALOG).map((r) => {
          const curTier = rentalTier(state, r.id);
          const left = rentalMsLeft(state, r.id);
          const effName = r.kind === 'power' ? '전투력' : `${concept.resources.currency.name} 수입`;
          return (
            <View key={r.id} style={s.rentBlock}>
              <View style={s.rentHead}>
                <Text style={s.rentEmoji}>{r.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>{r.label}</Text>
                  <Text style={s.reward}>
                    {curTier > 0 ? `현재 티어 ${curTier} · 남은 ${fmtLeft(left)}` : '미대여'}
                  </Text>
                </View>
              </View>
              <View style={s.tierRow}>
                {r.tiers.map((t) => {
                  const isCur = t.tier === curTier;
                  const isUpgrade = t.tier > curTier;
                  const label = isCur ? `연장 ${gem.emoji}${t.gem}` : isUpgrade ? `T${t.tier} ${gem.emoji}${t.gem}` : `T${t.tier}`;
                  return (
                    <View key={t.tier} style={{ flex: 1 }}>
                      <Btn small kind={isCur ? 'gold' : isUpgrade ? 'primary' : 'ghost'}
                        disabled={(!isCur && !isUpgrade) || (state.wallet.gem || 0) < t.gem}
                        label={label}
                        onPress={() => { rent(state, r.id, t.tier); bump(); }} />
                      <Text style={s.tierInfo}>{effName}+{Math.round(t.per * 100)}% · {t.days}일</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
        <Text style={s.disc}>※ 기간 종료 시 효과가 사라집니다. 추가 결제로 상위 티어 교체·연장.</Text>
      </Card>
      </>)}
    </ScrollView>

    {/* 하단 서브탭 바(메인 탭바 위) — 골드 채움 하이라이트 + 차르륵. */}
    <View style={s.subbar}>
      {SUBTABS.map((tb, i) => {
        const on = grp === tb.key;
        return (
          <Animated.View key={tb.key} style={{ flex: 1, opacity: anims[i], transform: [
            { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ] }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => { fx('tap'); setGrp(tb.key); }}
              style={[s.subCell, on && s.subCellOn]}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tb.label}>
              <Text style={[s.subIcon, on && s.subIconOn]}>{tb.icon}</Text>
              <Text style={[s.subLabel, on && s.subLabelOn]}>{tb.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 14 },
  sec: { color: T.text, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  shopHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  dim: { color: T.muted, fontSize: 12, fontWeight: '400' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.line },
  label: { color: T.text, fontWeight: '700', fontSize: 14 },
  reward: { color: T.muted, fontSize: 12, marginTop: 3 },
  msg: { color: T.accent, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  note: { color: T.accent, fontSize: 11, marginTop: 2 },
  tag: { color: T.accent, fontSize: 11, fontWeight: '800' },
  rentBlock: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.line },
  rentHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  rentEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  tierRow: { flexDirection: 'row', gap: 6 },
  tierInfo: { color: T.muted, fontSize: 9, textAlign: 'center', marginTop: 3 },
  disc: { color: T.muted, fontSize: 11, marginTop: 12, lineHeight: 16 },
  subsec: { color: T.text, fontWeight: '700', fontSize: 12, marginTop: 12, marginBottom: 2 },
  profHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  profFrame: { fontSize: 30 },
  nameInput: { color: T.text, fontWeight: '800', fontSize: 16, borderBottomWidth: 1, borderBottomColor: T.line, paddingVertical: 2 },
  profTitle: { color: T.accent, fontSize: 12, marginTop: 3, fontWeight: '700' },
  cosRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  // 환경 설정 이동 버튼(픽셀 화면·설정) — 상단 헤더 제거로 상점에 배치.
  envRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  envBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, borderRadius: 12, paddingVertical: 11 },
  envIcon: { fontSize: 16 },
  envLabel: { color: T.text, fontWeight: '800', fontSize: 13 },
  // 하단 서브탭 바 — 활성은 골드 채움(공통 규약).
  subbar: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.surface2 },
  subCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent' },
  subCellOn: { backgroundColor: T.accent, borderColor: T.accent },
  subIcon: { fontSize: 18, opacity: 0.55 },
  subIconOn: { opacity: 1 },
  subLabel: { color: T.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  subLabelOn: { color: '#241a40' },
});
