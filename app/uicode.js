import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────
// UI 코드 오버레이 — 개발용. 설정에서 켜면 각 요소 위에 넘버링 맵의
// 코드(a1~z2)를 작은 배지로 표시해, 수정 요청 시 위치를 즉시 지목할 수 있다.
// App이 설정값을 setUiCodes로 동기화하고, 각 화면이 <CodeTag id=".."/>를 심어둔다.
// pointerEvents=none 이라 실제 조작을 막지 않는다.
// ─────────────────────────────────────────────────────────────
let show = false;
export function setUiCodes(v) { show = !!v; }
export function uiCodesOn() { return show; }

export function CodeTag({ id, corner = 'tr' }) {
  if (!show) return null;
  const pos = corner === 'tl' ? { top: 1, left: 1 }
    : corner === 'bl' ? { bottom: 1, left: 1 }
    : corner === 'br' ? { bottom: 1, right: 1 }
    : { top: 1, right: 1 };
  return (
    <View pointerEvents="none" style={[uc.tag, pos]}>
      <Text style={uc.txt}>{id}</Text>
    </View>
  );
}

const uc = StyleSheet.create({
  tag: { position: 'absolute', backgroundColor: '#ff2d78', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 0.5, zIndex: 99, opacity: 0.94 },
  txt: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
});
