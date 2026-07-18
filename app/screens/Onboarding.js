import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { T, SPACE, RADIUS, FONT, WEIGHT, ELEV } from '../theme';
import { reducedMotion } from '../motion';
import { Btn } from '../components';
import { nextObjective } from '../../system/core/tutorial.mjs';
import { unlockStage } from '../../system/core/unlocks.mjs';

// 한국어 조사 — 컨셉별 명사(영웅/기체 등)에 받침 유무로 을/를·이/가 선택.
function hasBatchim(word) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xAC00 || c > 0xD7A3) return false; // 한글 아니면 받침 없음 취급
  return (c - 0xAC00) % 28 !== 0;
}
const eul = (w) => w + (hasBatchim(w) ? '을' : '를');
const ga = (w) => w + (hasBatchim(w) ? '이' : '가');

// 첫 실행 소개 캐러셀 — 핵심 루프를 4장으로 설명.
export function IntroModal({ concept, visible, onDone }) {
  const [i, setI] = useState(0);
  // 슬라이드 전환 시 내용 페이드 인(접근성/절전이면 즉시 표시).
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducedMotion()) { fade.setValue(1); return; }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [i]);
  const U = concept.terms.unit, S = concept.terms.stage;
  const slides = [
    { emoji: '🏰', title: `${concept.title}에 오신 걸 환영합니다`, body: `방치형 수집 RPG — 접속하지 않아도 ${ga(U)} 자동으로 싸우고 보상을 모읍니다.` },
    { emoji: '⚔️', title: `${eul(U)} 키우세요`, body: `영웅 탭에서 레벨업·돌파·장비로 강해집니다. 강할수록 더 깊은 ${S}로 자동 전진해요.` },
    { emoji: '🔮', title: '파티를 모으세요', body: `${S} ${unlockStage('gacha')}에서 소환이 열립니다. ${eul(U)} 모아 편성하면 전투력이 합쳐집니다.` },
    { emoji: '✨', title: '성장은 계속됩니다', body: '환생으로 영구 배수를 얻고 더 깊이 도전하세요. 이제 시작해봅시다!' },
  ];
  const last = i >= slides.length - 1;
  const s = slides[i];
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDone}>
      <View style={c.backdrop}>
        <View style={c.card}>
          <Animated.View style={{ alignItems: 'center', opacity: fade }}>
            <Text style={c.emoji}>{s.emoji}</Text>
            <Text style={c.title}>{s.title}</Text>
            <Text style={c.body}>{s.body}</Text>
          </Animated.View>
          <View style={c.dots}>
            {slides.map((_, j) => <View key={j} style={[c.dot, j === i && c.dotOn]} />)}
          </View>
          <Btn label={last ? '시작하기' : '다음'} kind="gold" onPress={() => (last ? onDone() : setI(i + 1))} />
          {!last && (
            <TouchableOpacity onPress={onDone} style={c.skip}><Text style={c.skipText}>건너뛰기</Text></TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// 다음 목표 배너 — state에서 유도. 탭하면 해당 탭으로 이동.
export function ObjectiveBanner({ state, concept, onGo }) {
  const obj = nextObjective(state);
  if (!obj) return null;
  const U = concept.terms.unit, S = concept.terms.stage;
  const TEXT = {
    level: `🎯 ${eul(U)} 레벨업하세요 — ${S} ${obj.target} 도달 시 소환 해금`,
    summon: `🎯 소환 탭에서 ${eul(U)} 뽑아 파티를 모으세요`,
    party: `🎯 영웅 탭 > 편성에서 파티를 짜세요 (전투력 합산)`,
    prestige: `✨ 환생으로 영구 배수를 얻고 더 깊이 도전하세요 (방치 탭)`,
    formation: `⚔️ 진형(전열/후열)으로 전략을 세우세요 — 영웅 탭 > 편성`,
    arena: `🏆 아레나에 도전하세요 — 콘텐츠 탭 > 경쟁 (약자 보호 매칭)`,
  };
  // 탭 재편(7→5)으로 사라진 목적지 리매핑 — arena/meta는 흡수된 탭으로 이동.
  const goTab = { arena: 'content', meta: 'roster' }[obj.tab] || obj.tab;
  return (
    <TouchableOpacity style={c.banner} activeOpacity={0.8} onPress={() => onGo(goTab)}>
      <Text style={c.bannerText} numberOfLines={2}>{TEXT[obj.id]}</Text>
      <Text style={c.bannerGo}>›</Text>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: SPACE.xl + 8 },
  // 소개 카드 — 토큰 기반 + 모달 깊이(그림자). 강조 테두리 유지.
  card: { backgroundColor: T.surface, borderRadius: RADIUS.xl + 6, padding: SPACE.xl + 6, alignItems: 'center', borderWidth: 1, borderColor: T.accent, width: '100%', maxWidth: 360, ...ELEV.modal },
  emoji: { fontSize: FONT.giant, marginBottom: SPACE.xs },
  title: { color: T.text, fontWeight: WEIGHT.black, fontSize: FONT.head, marginTop: SPACE.sm, textAlign: 'center' },
  body: { color: T.muted, fontSize: FONT.label, lineHeight: 22, marginTop: SPACE.md, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 7, marginVertical: SPACE.lg },
  dot: { width: 8, height: 8, borderRadius: RADIUS.sm, backgroundColor: T.surface2 },
  dotOn: { backgroundColor: T.accent, width: 20 },
  skip: { marginTop: SPACE.md, padding: SPACE.xs + 2 },
  skipText: { color: T.muted, fontSize: FONT.sub, fontWeight: WEIGHT.medium },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: T.accent, paddingHorizontal: SPACE.lg - 2, paddingVertical: SPACE.md - 2, marginHorizontal: SPACE.lg - 2, marginBottom: SPACE.xs, ...ELEV.card },
  bannerText: { color: T.text, fontSize: FONT.sub, fontWeight: WEIGHT.bold, flex: 1, lineHeight: 18 },
  bannerGo: { color: T.accent, fontSize: FONT.head, fontWeight: WEIGHT.heavy, marginLeft: SPACE.sm },
});
