import React, { useRef, useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { frameAt, stateSpec, isPlaybackDone } from '../system/core/spriteAnim.mjs';
import { reducedMotion } from './motion';

// ─────────────────────────────────────────────────────────────
// SpriteAnim — 가로 스트립 스프라이트 시트를 프레임 애니메이션한다(RN + 웹).
//   프레임 창(overflow hidden) 안에서 시트 Image를 프레임 폭만큼 좌측 이동.
//   순수 계산은 system/core/spriteAnim.mjs. 절전/연출끔이면 프레임 0 정지.
//   props: source(require) · frameW · frameH · frames · state('idle'|'attack'|...)
//          · scale · onEnd(1회 재생 완료 콜백) · playToken(공격 재생 트리거 변경값)
// ─────────────────────────────────────────────────────────────
export default function SpriteAnim({
  source, frameW = 128, frameH = 128, frames, state = 'idle',
  scale = 1, onEnd, playToken,
}) {
  const spec = stateSpec(state);
  const n = frames || 1;
  const [frame, setFrame] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(null);
  const endedRef = useRef(false);

  useEffect(() => {
    // 절전/모션끔: 정적(첫 프레임) — 루프 미시작으로 발열↓.
    if (reducedMotion() || n <= 1) { setFrame(0); return undefined; }
    startRef.current = Date.now();
    endedRef.current = false;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const elapsed = Date.now() - startRef.current;
      setFrame(frameAt(elapsed, spec.fps, n, spec.loop));
      if (!spec.loop && isPlaybackDone(elapsed, spec.fps, n)) {
        if (!endedRef.current) { endedRef.current = true; if (onEnd) onEnd(); }
        return; // 1회 재생 완료 → 마지막 프레임 유지
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { alive = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // playToken이 바뀌면(새 공격) 재생을 다시 시작.
  }, [state, playToken, n, spec.fps, spec.loop]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheetW = frameW * n;
  return (
    <View style={[s.window, { width: frameW * scale, height: frameH * scale }]}>
      <Image
        source={source}
        style={{
          width: sheetW * scale, height: frameH * scale,
          transform: [{ translateX: -frame * frameW * scale }],
        }}
        resizeMode="stretch"
        fadeDuration={0}
      />
    </View>
  );
}

const s = StyleSheet.create({
  window: { overflow: 'hidden' },
});
