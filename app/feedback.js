import { Platform } from 'react-native';
import { soundFile } from './soundFiles';

// ─────────────────────────────────────────────────────────────
// 피드백 엔진 — 사운드 + 햅틱. 에셋 없이 즉시 동작.
//   · 실오디오: assets/sfx에 파일 등록 시 expo-av로 재생(우선).
//   · 폴백: 없으면 Web Audio API 신스로 합성(오디오 파일 불필요).
//   · 네이티브: expo-haptics 진동 / 웹: navigator.vibrate.
//   fx(name) 한 번으로 소리+진동을 함께 재생한다.
// ─────────────────────────────────────────────────────────────

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch { Haptics = null; }
let AV = null;
try { AV = require('expo-av'); } catch { AV = null; }

// ── 실오디오 파일 재생 (등록된 경우) ─────────────────────────
const _sndCache = {};
async function playFile(name, src) {
  if (!AV) return false;
  try {
    let snd = _sndCache[name];
    if (!snd) {
      const r = await AV.Audio.Sound.createAsync(src, { volume: 0.85 });
      snd = r.sound; _sndCache[name] = snd;
    }
    await snd.replayAsync();
    return true;
  } catch { return false; }
}

const isWeb = Platform.OS === 'web';
let muted = false;
let hapticsOn = true;
export function setMuted(m) { muted = !!m; }
export function isMuted() { return muted; }
export function setHaptics(h) { hapticsOn = h !== false; }

// ── Web Audio 합성 ────────────────────────────────────────────
let _ctx = null;
function actx() {
  if (!isWeb) return null;
  try {
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    _ctx = _ctx || new AC();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
}

// 한 음 스케줄 (주파수·시작오프셋·길이·파형·게인)
function tone(freq, at, dur, type = 'sine', gain = 0.12) {
  const ctx = actx(); if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}
function sweep(f1, f2, at, dur, type = 'sawtooth', gain = 0.1) {
  const ctx = actx(); if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(f1, t0);
  osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

// 음이름 → 주파수 (A4=440)
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

const SOUNDS = {
  click: () => tone(660, 0, 0.05, 'square', 0.05),
  tap: () => tone(440, 0, 0.04, 'triangle', 0.045),
  success: () => { tone(N.C5, 0, 0.1, 'sine', 0.1); tone(N.G5, 0.08, 0.14, 'sine', 0.1); },
  coin: () => { tone(N.E6, 0, 0.06, 'square', 0.07); tone(N.G6, 0.06, 0.1, 'square', 0.06); },
  levelup: () => { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.07, 0.16, 'sine', 0.09)); },
  summon: () => sweep(300, 900, 0, 0.5, 'sawtooth', 0.08),
  sr: () => { [N.C5, N.E5, N.G5].forEach((f, i) => tone(f, i * 0.05, 0.3, 'triangle', 0.09)); },
  ssr: () => {
    [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => tone(f, i * 0.08, 0.4, 'triangle', 0.1));
    tone(N.G6, 0.5, 0.5, 'sine', 0.08); tone(N.C6, 0.5, 0.5, 'sine', 0.06);
  },
  win: () => { tone(N.G5, 0, 0.1, 'triangle', 0.09); tone(N.C6, 0.09, 0.18, 'triangle', 0.09); },
  error: () => sweep(300, 120, 0, 0.18, 'square', 0.06),
};

// ── 햅틱 ──────────────────────────────────────────────────────
const VIBE_WEB = { click: 8, tap: 6, success: [0, 20, 30, 20], coin: 10, levelup: [0, 15, 20, 15, 20, 30], summon: 20, sr: [0, 25, 30, 25], ssr: [0, 30, 40, 30, 40, 60], win: [0, 20, 30, 20], error: [0, 40, 30, 40] };
function haptic(name) {
  if (!hapticsOn) return;
  if (isWeb) {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(VIBE_WEB[name] || 0); } catch { /* 무시 */ }
    return;
  }
  if (!Haptics) return;
  try {
    if (name === 'ssr' || name === 'error') Haptics.notificationAsync(name === 'ssr' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    else if (name === 'success' || name === 'win' || name === 'levelup') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (name === 'sr' || name === 'summon') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* 무시 */ }
}

// 이름 있는 피드백 재생 (소리 + 진동).
//   실오디오 파일이 등록돼 있으면 그걸, 없으면 신스로 폴백.
export function fx(name) {
  if (muted) return;
  const src = soundFile(name);
  if (src) { playFile(name, src); }
  else { try { (SOUNDS[name] || SOUNDS.click)(); } catch { /* 무시 */ } }
  haptic(name);
}
