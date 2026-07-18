import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { T } from './theme';

// ─────────────────────────────────────────────────────────────
// 에러 바운더리 — 렌더 중 예외가 나도 앱이 하얗게 죽지 않게 잡는다.
//   · 세이브는 저장소에 그대로 보존(여기서 지우지 않음) → 진행 보호.
//   · "다시 시도"로 렌더를 재개하거나, 웹은 새로고침으로 복구.
// ─────────────────────────────────────────────────────────────
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // 원인 추적용 — 컴포넌트 스택 상단을 화면에도 노출(테스트 단계).
    const cs = (info && info.componentStack || '').trim().split('\n').slice(0, 3).join(' ‹ ').trim();
    this.setState({ stack: cs });
    if (typeof console !== 'undefined') console.error('ErrorBoundary:', error, info?.componentStack);
  }

  retry = () => this.setState({ error: null });

  reload = () => {
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.reload();
    } else {
      this.retry();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={s.wrap}>
        <Text style={s.emoji}>🛡️</Text>
        <Text style={s.title}>일시적인 오류가 발생했어요</Text>
        <Text style={s.sub}>진행 상황은 안전하게 저장되어 있습니다.{'\n'}다시 시도하거나 앱을 새로고침해 주세요.</Text>
        <View style={s.row}>
          <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={this.retry} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>다시 시도</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={this.reload} activeOpacity={0.85}>
            <Text style={s.btnGhostText}>{Platform.OS === 'web' ? '새로고침' : '재시작'}</Text>
          </TouchableOpacity>
        </View>
        {/* 원인 표시(테스트 단계) — 메시지 + 컴포넌트 위치. */}
        <Text style={s.detail} numberOfLines={6} selectable>
          {String(this.state.error?.message || this.state.error)}
          {this.state.stack ? `\n@ ${this.state.stack}` : ''}
        </Text>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 56 },
  title: { color: T.text, fontWeight: '900', fontSize: 20, marginTop: 12, textAlign: 'center' },
  sub: { color: T.muted, fontSize: 13, marginTop: 10, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12, marginTop: 22 },
  btn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  btnPrimary: { backgroundColor: T.accent },
  btnPrimaryText: { color: '#3a2a05', fontWeight: '800', fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: T.line },
  btnGhostText: { color: T.text, fontWeight: '700', fontSize: 15 },
  detail: { color: T.muted, fontSize: 11, marginTop: 20, opacity: 0.7, textAlign: 'center' },
});
