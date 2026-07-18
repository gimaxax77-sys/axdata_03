import { Platform } from 'react-native';

// 세이브 저장소 어댑터.
//   · 웹    : localStorage (동기 즉시 로드 → 첫 렌더에 세이브 반영, 깜빡임 없음)
//   · 네이티브 : AsyncStorage (비동기 → 마운트 후 하이드레이트)
// 컨셉별로 세이브를 분리 — 판타지는 기존 키 유지(하위호환), SF는 별도 키.
let AsyncStorage = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch { AsyncStorage = null; }

const isWeb = Platform.OS === 'web';
function conceptId() {
  let id = (typeof globalThis !== 'undefined' && globalThis.__ELDRIA_CONCEPT__) || null;
  if (!id) { try { id = require('expo-constants').default?.expoConfig?.extra?.concept; } catch { id = null; } }
  return id || 'fantasy';
}
const _cid = conceptId();
const KEY = _cid === 'fantasy' ? 'eldria_save_v2' : `eldria_save_v2_${_cid}`;
const BACKUP_KEY = `${KEY}_backup`; // 마지막 정상본 — 메인 손상 시 복구용

function ls() {
  try {
    return typeof globalThis !== 'undefined' && globalThis.localStorage ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

// 동기 로드 — 웹만 즉시 값 반환. 네이티브는 null(이후 loadRawAsync로 하이드레이트).
export function loadRawSync() {
  if (isWeb) { try { return ls()?.getItem(KEY) ?? null; } catch { return null; } }
  return null;
}

// 비동기 로드 — 네이티브 AsyncStorage. 웹은 동기값을 그대로 반환.
export async function loadRawAsync() {
  if (isWeb) return loadRawSync();
  if (AsyncStorage) { try { return await AsyncStorage.getItem(KEY); } catch { return null; } }
  return null;
}

export function saveRaw(str) {
  if (isWeb) { try { ls()?.setItem(KEY, str); } catch { /* 무시 */ } return; }
  if (AsyncStorage) { AsyncStorage.setItem(KEY, str).catch(() => {}); }
}

export function clearSave() {
  if (isWeb) { try { ls()?.removeItem(KEY); ls()?.removeItem(BACKUP_KEY); } catch { /* 무시 */ } return; }
  if (AsyncStorage) { AsyncStorage.removeItem(KEY).catch(() => {}); AsyncStorage.removeItem(BACKUP_KEY).catch(() => {}); }
}

// 마지막 정상본 백업 — 메인 쓰기가 중단/손상돼도 직전 상태를 보존.
export function saveBackup(str) {
  if (isWeb) { try { ls()?.setItem(BACKUP_KEY, str); } catch { /* 무시 */ } return; }
  if (AsyncStorage) { AsyncStorage.setItem(BACKUP_KEY, str).catch(() => {}); }
}

// 웹 동기 백업 로드 (부팅 시 메인 손상 복구용). 네이티브는 비동기.
export function loadBackupSync() {
  if (isWeb) { try { return ls()?.getItem(BACKUP_KEY) ?? null; } catch { return null; } }
  return null;
}
export async function loadBackupAsync() {
  if (isWeb) return loadBackupSync();
  if (AsyncStorage) { try { return await AsyncStorage.getItem(BACKUP_KEY); } catch { return null; } }
  return null;
}
