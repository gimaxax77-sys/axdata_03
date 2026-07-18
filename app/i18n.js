// ─────────────────────────────────────────────────────────────
// 경량 현지화(i18n) — 문자열 테이블 + t(key). 기본 한국어, 영어 준비.
//   컴포넌트는 t('key')로 문자열을 읽고, 언어 변경 시 setLang + 리렌더로 반영.
//   컨셉/장르가 붙이는 라벨(캐릭터명 등)과 무관한 "UI 표면 문자열"만 담는다.
//   깊은 배선은 점진적으로 확대(스캐폴드) — 누락 키는 한국어→키로 폴백.
// ─────────────────────────────────────────────────────────────

const STRINGS = {
  ko: {
    app_subtitle: '방치형 수집 RPG · 자동 저장',
    settings: '설정',
    sound: '사운드', sound_desc: '효과음 재생',
    haptic: '햅틱', haptic_desc: '진동 피드백 (모바일)',
    battle_fx: '전투 연출', battle_fx_desc: '애니메이션 (끄면 배터리 절약)',
    eco_mode: '절전 모드', eco_mode_desc: '애니메이션 정지 + 화면 갱신 최소화 (발열·배터리↓)',
    language: '언어',
    data: '데이터',
    reset: '처음부터 다시 시작 (초기화)',
    reset_note: '세이브는 이 기기에만 저장됩니다. 초기화하면 되돌릴 수 없습니다.',
    transfer: '세이브 이관',
    export_save: '이관 코드 복사',
    import_save: '코드로 불러오기',
    import_placeholder: 'ELD1: 로 시작하는 코드를 붙여넣기',
    import_ok: '불러오기 완료!',
    import_fail: '코드가 올바르지 않습니다',
    copied: '코드를 복사했어요',
    transfer_note: '다른 기기에서 이 코드로 진행을 이어갈 수 있습니다.',
    close: '닫기',
  },
  en: {
    app_subtitle: 'Idle Collection RPG · Auto-save',
    settings: 'Settings',
    sound: 'Sound', sound_desc: 'Play sound effects',
    haptic: 'Haptics', haptic_desc: 'Vibration feedback (mobile)',
    battle_fx: 'Battle FX', battle_fx_desc: 'Animations (off saves battery)',
    eco_mode: 'Eco Mode', eco_mode_desc: 'Stop animations + minimal refresh (less heat/battery)',
    language: 'Language',
    data: 'Data',
    reset: 'Restart from scratch (reset)',
    reset_note: 'Your save is stored on this device only. A reset cannot be undone.',
    transfer: 'Save Transfer',
    export_save: 'Copy transfer code',
    import_save: 'Load from code',
    import_placeholder: 'Paste a code starting with ELD1:',
    import_ok: 'Loaded!',
    import_fail: 'Invalid code',
    copied: 'Code copied',
    transfer_note: 'Continue your progress on another device with this code.',
    close: 'Close',
  },
};

export const LANGS = [{ id: 'ko', label: '한국어' }, { id: 'en', label: 'English' }];

let _lang = 'ko';
export function setLang(l) { if (STRINGS[l]) _lang = l; }
export function getLang() { return _lang; }

export function t(key, fallback) {
  const table = STRINGS[_lang] || STRINGS.ko;
  return table[key] ?? STRINGS.ko[key] ?? fallback ?? key;
}
