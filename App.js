import './app/backend/supabaseImpl'; // Supabase 클라우드 공급자 등록(계정·역할·세이브)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, Modal, Alert, useWindowDimensions, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from './app/theme';
import { ResourceBar, Btn, fmt } from './app/components';
import { useGame } from './app/useGame';
import { isOn } from './system/core/features.mjs';
import { setMuted, setHaptics, fx } from './app/feedback';
import { setReduceMotion, setEco } from './app/motion';
import { setUiCodes } from './app/uicode';
import { t, setLang } from './app/i18n';
import { SettingsModal } from './app/screens/Settings';
import { AdminModal } from './app/screens/Admin';
import { ConsoleModal } from './app/screens/Console';
import { NoticePopup } from './app/screens/NoticePopup';
import { MailboxModal } from './app/screens/MailboxModal';
import { unreadMailCount } from './system/core/mailbox.mjs';
import { useFonts } from 'expo-font';
import IdleScreen from './app/screens/IdleScreen';
import RosterScreen from './app/screens/RosterScreen';
import GachaScreen from './app/screens/GachaScreen';
import ContentScreen from './app/screens/ContentScreen';
import ShopScreen from './app/screens/ShopScreen';
import { IntroModal } from './app/screens/Onboarding';
import ErrorBoundary from './app/ErrorBoundary';
import { canClaimAttendance, missionList } from './system/core/daily.mjs';
import { weeklyEvent } from './system/core/events.mjs';
import { summonMasteryInfo } from './system/core/summonMastery.mjs';
import { can } from './system/core/roles.mjs';

// 탭 화면을 React.memo로 감싼다 — 방치 틱(초당)에는 rev/props가 안 바뀌어
// 비활성 화면이 리렌더되지 않는다(탭 전환·조작 렉 제거).
// 세나키우기식 타이트한 5탭. 경쟁→콘텐츠, 기록→영웅 서브탭으로 흡수(소환은 과금 노출 위해 유지).
// 탭 목록 — feat 가 붙은 탭은 해당 선택 모듈이 켜졌을 때만 노출(컨트롤 판넬로 on/off).
const ALL_TABS = [
  { key: 'idle', label: '전투', icon: '🏰', Screen: React.memo(IdleScreen) },
  { key: 'roster', label: '영웅', icon: '🦸', Screen: React.memo(RosterScreen) },
  { key: 'gacha', label: '소환', icon: '🔮', Screen: React.memo(GachaScreen), feat: 'gacha' },
  { key: 'content', label: '콘텐츠', icon: '📅', Screen: React.memo(ContentScreen) },
  { key: 'shop', label: '상점', icon: '🛒', Screen: React.memo(ShopScreen), feat: 'shop' },
];
const TABS = ALL_TABS.filter((tab) => !tab.feat || isOn(tab.feat));

// 시트에 얹는 영웅 화면 — 메모된 인스턴스 재사용(초당 방치틱 리렌더 차단).
const RosterMemo = TABS.find((t) => t.key === 'roster').Screen;

function fmtDuration(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

// 영웅 바텀시트 — 상단 자동전투는 그대로 두고(방치 화면 베이스) 하단에서 시트가 올라온다.
// 강화하는 동안 위 전투가 실시간으로 강해지는 걸 눈으로 확인(레이어 구조).
const IS_WEB = Platform.OS === 'web';
function RosterSheet({ children, onClose, reduce }) {
  // 웹: CSS transition 으로 슬라이드를 컴포지터(GPU) 스레드에 넘긴다.
  //   → JS 스레드가 아무리 바빠도(내용 마운트·틱 리렌더) 슬라이드는 매끄럽다.
  //   내용을 즉시 마운트해도 CSS 전환이 별도 스레드에서 돌아 버벅이지 않는다.
  // 네이티브: useNativeDriver Animated + 슬라이드 후 지연 마운트(완료 콜백).
  const a = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const [open, setOpen] = useState(!!reduce);      // 웹 CSS 전환 트리거
  const [ready, setReady] = useState(IS_WEB || !!reduce); // 웹은 즉시 마운트
  useEffect(() => {
    if (reduce) { a.setValue(1); setOpen(true); setReady(true); return; }
    if (IS_WEB) {
      const r = requestAnimationFrame(() => setOpen(true)); // off→on 프레임 분리로 전환 발동
      return () => cancelAnimationFrame(r);
    }
    a.setValue(0);
    let alive = true;
    Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true })
      .start(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const webStyle = {
    opacity: open ? 1 : 0,
    transform: [{ translateY: open ? 0 : 520 }],
    transitionProperty: 'transform, opacity',
    transitionDuration: '320ms',
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
  };
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });
  const nativeStyle = { opacity: a, transform: [{ translateY }] };
  const Sheet = IS_WEB ? View : Animated.View;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 위 전투가 비치도록 옅은 스크림 — 탭하면 닫힘(방치로 복귀). */}
      <TouchableOpacity style={sh.scrim} activeOpacity={1} onPress={onClose}
        accessibilityRole="button" accessibilityLabel="강화 시트 닫기" />
      <Sheet style={[sh.sheet, IS_WEB ? webStyle : nativeStyle]}>
        <View style={sh.grip} />
        <TouchableOpacity style={sh.x} onPress={onClose} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel="닫기">
          <Text style={sh.xTxt}>✕</Text>
        </TouchableOpacity>
        <View style={sh.body}>{ready ? children : <View style={sh.loading}><Text style={sh.loadingTxt}>불러오는 중…</Text></View>}</View>
      </Sheet>
    </View>
  );
}
const sh = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,8,26,0.28)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%',
    backgroundColor: T.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderBottomWidth: 0, borderColor: T.line, overflow: 'hidden' },
  grip: { width: 40, height: 4, borderRadius: 3, backgroundColor: T.line, alignSelf: 'center', marginTop: 8, marginBottom: 2 },
  x: { position: 'absolute', top: 8, right: 12, width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  xTxt: { color: T.muted, fontSize: 14, fontWeight: '900' },
  body: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt: { color: T.muted, fontSize: 13, fontWeight: '700' },
});

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const game = useGame();
  // 갈무리 픽셀폰트 로드(비차단) — 로딩 전엔 시스템 폰트로 폴백.
  useFonts({
    Galmuri11: require('./assets/fonts/Galmuri11.ttf'),
    'Galmuri11-Bold': require('./assets/fonts/Galmuri11-Bold.ttf'),
  });
  const [tab, setTab] = useState('idle');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const mailUnread = unreadMailCount(game.state);
  const [noticePopupClosed, setNoticePopupClosed] = useState(false);
  // 공지/이벤트 팝업 — 새 공지가 있으면 접속 시 가운데 모달로 1회 표시.
  //   서명(공지+이벤트 텍스트)이 이전에 확인한 것과 다르면 다시 뜬다.
  const noticeText = game.remote?.notice?.text || null;
  const eventText = game.remote?.event?.text || null;
  const noticeSig = (noticeText || eventText) ? `${noticeText || ''}|${eventText || ''}` : null;
  const showNoticePopup = !!noticeSig && !noticePopupClosed
    && noticeSig !== game.state.settings.dismissedNotice;
  const dismissNoticePopup = useCallback(() => {
    game.state.settings.dismissedNotice = noticeSig;
    game.save();
    setNoticePopupClosed(true);
  }, [game, noticeSig]);
  // 운영자 조작 접근 게이트: 백엔드 연결 시 admin 역할만, 순수 오프라인이면 기존대로 허용.
  const adminUnlocked = !game.cloud.available || can(game.cloud.role, 'tuneBalance');
  // 운영자 콘솔(공지·이벤트) 접근: 매니저 이상만 — 백엔드 연결 시에만 노출.
  const consoleUnlocked = game.cloud.available && can(game.cloud.role, 'sendNotice');
  // 상점으로 옮긴 환경 버튼(픽셀 화면·설정) 핸들러 — memo 유지 위해 안정 참조(useCallback).
  const openSettings = useCallback(() => { fx('tap'); setSettingsOpen(true); }, []);
  // 영웅 탭은 방치 전투를 켠 채 바텀시트로 표시 — 베이스 화면은 방치(idle).
  const isRoster = tab === 'roster';
  const baseKey = isRoster ? 'idle' : tab;
  const BaseScreen = (TABS.find((t) => t.key === baseKey) || TABS[0]).Screen;
  // 설정을 세이브에서 엔진들에 반영
  const st = game.state.settings;
  setLang(st.lang); // 렌더 중 동기 반영 — 언어 전환이 같은 렌더에 즉시 적용(지연 없음)
  useEffect(() => { setMuted(st.muted); setHaptics(st.haptics); setReduceMotion(st.reduceMotion); setEco(st.ecoMode); setUiCodes(st.uiCodes); }, [st.muted, st.haptics, st.reduceMotion, st.ecoMode, st.uiCodes]);
  // 가로 wide(PC/태블릿) — 넓은 화면에서 콘텐츠를 폰 폭으로 가운데 정렬(늘어짐 방지).
  const { width: winW } = useWindowDimensions();
  const wide = winW >= 720;
  // 탭별 "받을 보상 있음" 뱃지 — rev(액션)마다 재계산(가벼운 조회).
  const gs = game.state;
  const wev = weeklyEvent(gs);
  const tabDots = {
    content: canClaimAttendance(gs) || missionList(gs).some((mm) => mm.done && !mm.claimed) || (wev.done && !wev.claimed),
    gacha: ['hero', 'pet', 'gear', 'rune', 'cosmetic', 'guardian'].some((k) => summonMasteryInfo(gs, k).claimable),
  };
  const changeSetting = (key, val) => {
    game.state.settings[key] = val;
    // 엔진 반영은 위 useEffect가 담당(settings 값 변화 감지). 여기선 상태만 갱신.
    if (!game.state.settings.muted) fx('tap');
    game.save(); game.bump();
  };

  const doReset = () => {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && globalThis.confirm && !globalThis.confirm('정말 처음부터 다시 시작할까요? 저장이 삭제됩니다.')) return;
      game.reset();
    } else {
      Alert.alert('초기화', '정말 처음부터 다시 시작할까요? 저장이 삭제됩니다.', [
        { text: '취소', style: 'cancel' },
        { text: '초기화', style: 'destructive', onPress: game.reset },
      ]);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <LinearGradient colors={T.bgGrad} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {/* 가로 wide: 넓은 화면에선 폰 폭으로 가운데 정렬한 프레임 안에 배치 */}
      <View style={[s.frame, wide && s.frameWide]}>
      {/* 게임명/장르 헤더 제거 — 자원바가 최상단. 픽셀 화면·설정은 상점 탭으로 이동. */}
      <View style={s.resWrap}>
          <View style={s.topRow}>
            <View style={{ flex: 1 }}>
              <ResourceBar concept={game.concept} wallet={game.state.wallet} />
            </View>
            <TouchableOpacity style={s.mailBtn} activeOpacity={0.8}
              onPress={() => { fx('tap'); setMailboxOpen(true); }}
              accessibilityRole="button" accessibilityLabel="우편함">
              <Text style={s.mailIcon}>📬</Text>
              {mailUnread > 0 && (
                <View style={s.mailBadge}>
                  <Text style={s.mailBadgeTxt}>{mailUnread > 99 ? '99+' : mailUnread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

      {/* 원격 공지/이벤트 배너 (Remote Config) — 탭 1회 닫기 */}
      {(game.remote?.notice || game.remote?.event) && !noticeHidden && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => setNoticeHidden(true)} style={s.notice}>
          <Text style={s.noticeText} numberOfLines={2}>
            {game.remote.event?.text ? `🎉 ${game.remote.event.text}` : `📢 ${game.remote.notice.text}`}
          </Text>
          <Text style={s.noticeX}>✕</Text>
        </TouchableOpacity>
      )}

      {/* 화면 — rev(액션 신호)로만 리렌더. lastGain은 방치 탭에만 전달해
          다른 탭이 초당 리렌더되지 않게 한다. */}
      <View style={s.body}>
        <BaseScreen state={game.state} rev={game.rev} bump={game.bump} concept={game.concept}
          lastGain={baseKey === 'idle' ? game.lastGain : undefined}
          background={isRoster}
          onOpenSettings={openSettings} />
        {/* 영웅 강화 바텀시트 — 위 전투(방치 베이스) 유지, 아래에서 시트 등장. */}
        {isRoster && (
          <RosterSheet onClose={() => setTab('idle')} reduce={st.reduceMotion}>
            <RosterMemo state={game.state} rev={game.rev} bump={game.bump} concept={game.concept} />
          </RosterSheet>
        )}
      </View>

      {/* 하단 탭 — 받을 것 있는 탭엔 빨간 점(●) 뱃지. */}
      <View style={s.tabbar}>
        {TABS.map((t) => {
          const on = t.key === tab;
          const dot = !!tabDots[t.key];
          return (
            <TouchableOpacity key={t.key} style={s.tab} onPress={() => setTab(t.key)} activeOpacity={0.8}
              accessibilityRole="tab" accessibilityLabel={dot ? `${t.label} (받을 보상 있음)` : t.label} accessibilityState={{ selected: on }}>
              <View style={[s.tabInd, on && s.tabIndOn]} />
              <View>
                <Text style={[s.tabIcon, on && s.tabIconOn]}>{t.icon}</Text>
                {dot && <View style={s.tabDot} />}
              </View>
              <Text style={[s.tabLabel, on && s.tabLabelOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </View>{/* /frame */}

      {/* 오프라인 보상 팝업 */}
      <Modal transparent animationType="fade" visible={!!game.offline} onRequestClose={game.dismissOffline}>
        <View style={s.backdrop}>
          <View style={s.offCard}>
            <Text style={s.offEmoji}>🎁</Text>
            <Text style={s.offTitle}>다시 오셨네요!</Text>
            <Text style={s.offSub}>자리를 비운 {fmtDuration(game.offline?.seconds || 0)} 동안{'\n'}자동으로 전투해 보상을 모았어요.</Text>
            <View style={s.offGains}>
              <Text style={s.offGain}>{game.concept.resources.currency.emoji} +{fmt(game.offline?.gained?.currency || 0)}</Text>
              <Text style={s.offGain}>{game.concept.resources.growth.emoji} +{fmt(game.offline?.gained?.growth || 0)}</Text>
            </View>
            {game.offline?.doubled ? (
              <Text style={s.offBonus}>✨ 2배 적용됨{game.state.profile?.premium ? ' (광고제거 패스)' : ''}</Text>
            ) : null}
            <View style={{ height: 14 }} />
            {!game.offline?.doubled && (
              <>
                <Btn label="📺 광고 보고 2배" kind="gold" onPress={game.claimOfflineBonus} />
                <View style={{ height: 8 }} />
              </>
            )}
            <Btn label="받기" kind={game.offline?.doubled ? 'gold' : 'ghost'} onPress={game.dismissOffline} />
          </View>
        </View>
      </Modal>

      {/* 설정 */}
      <SettingsModal
        visible={settingsOpen}
        settings={game.state.settings}
        onChange={changeSetting}
        onReset={() => { setSettingsOpen(false); doReset(); }}
        onClose={() => setSettingsOpen(false)}
        onExport={game.exportSave}
        onImport={game.importSave}
        onOpenAdmin={adminUnlocked ? () => { setSettingsOpen(false); setAdminOpen(true); } : undefined}
        onOpenConsole={consoleUnlocked ? () => { setSettingsOpen(false); setConsoleOpen(true); } : undefined}
        cloud={game.cloud}
        onSync={game.syncNow}
        onSignOut={game.signOutCloud}
        onSignUp={game.signUpEmail}
        onSignInEmail={game.signInEmail}
      />

      {/* 운영자 조작 패널 */}
      <AdminModal
        visible={adminOpen}
        state={game.state}
        onChange={() => { game.save(); game.bump(); }}
        onClose={() => setAdminOpen(false)}
      />

      {/* 운영자 콘솔 (공지·이벤트) */}
      <ConsoleModal
        visible={consoleOpen}
        role={game.cloud.role}
        remote={game.remote}
        onSet={game.setRemoteConfig}
        onClear={game.clearRemoteConfig}
        onSendMail={game.sendMailCloud}
        onClose={() => setConsoleOpen(false)}
      />

      {/* 우편함 — 상단 아이콘으로 어디서든 열기 */}
      <MailboxModal
        visible={mailboxOpen}
        state={game.state}
        concept={game.concept}
        bump={game.bump}
        onClose={() => setMailboxOpen(false)}
      />

      {/* 공지/이벤트 팝업 — 접속 시 새 공지가 있으면 표시 */}
      <NoticePopup
        visible={showNoticePopup}
        notice={noticeText}
        event={eventText}
        onClose={dismissNoticePopup}
      />

      {/* 첫 실행 소개 — 오프라인 팝업이 없을 때만 노출 */}
      <IntroModal
        concept={game.concept}
        visible={!game.state.tutorial.introSeen && !game.offline}
        onDone={() => { game.state.tutorial.introSeen = true; game.save(); game.bump(); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  frame: { flex: 1 },
  // 넓은 화면(PC/태블릿 가로): 폰 폭으로 가운데 정렬 + 좌우 경계선으로 프레임감.
  frameWide: { width: '100%', maxWidth: 720, alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: T.line },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginTop: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.accent },
  noticeText: { color: T.text, fontSize: 12, fontWeight: '700', flex: 1 },
  noticeX: { color: T.muted, fontSize: 14, fontWeight: '900' },
  resWrap: { paddingHorizontal: 14, paddingVertical: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mailBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center' },
  mailIcon: { fontSize: 20 },
  mailBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: T.surface },
  mailBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  body: { flex: 1 },
  tabbar: { flexDirection: 'row', backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.line, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  // 활성 탭 상단 인디케이터 — 어느 탭인지 즉시 인지(세나키우기식 강조).
  tabInd: { alignSelf: 'stretch', height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 5, marginHorizontal: 14 },
  tabIndOn: { backgroundColor: T.accent },
  tabIcon: { fontSize: 22, opacity: 0.5 },
  tabDot: { position: 'absolute', top: -2, right: -7, width: 9, height: 9, borderRadius: 5, backgroundColor: T.danger, borderWidth: 1.5, borderColor: T.surface },
  tabIconOn: { opacity: 1 },
  tabLabel: { color: T.muted, fontSize: 11, marginTop: 2, fontWeight: '700' },
  tabLabelOn: { color: T.accent },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  offCard: { backgroundColor: T.surface, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: T.accent, width: '100%', maxWidth: 340 },
  offEmoji: { fontSize: 52 },
  offTitle: { color: T.text, fontWeight: '900', fontSize: 22, marginTop: 6 },
  offSub: { color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  offGains: { flexDirection: 'row', gap: 20, marginTop: 16 },
  offGain: { color: T.good, fontWeight: '800', fontSize: 20 },
  offBonus: { color: T.accent, fontWeight: '800', fontSize: 13, marginTop: 12 },
});
