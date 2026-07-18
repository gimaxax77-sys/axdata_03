// 전투 연출/애니메이션 축소 플래그 (접근성·배터리 절약).
// App이 설정에서 동기화하고, BattleView/소환 연출이 이를 읽어 애니메이션을 끈다.
//   · reduceMotion : 사용자가 연출을 끔(접근성).
//   · ecoMode      : 절전 모드 — 애니메이션 정지 + 화면 갱신 빈도↓(발열/배터리).
// 둘 중 하나라도 켜지면 애니메이션은 즉시 완료 상태로 렌더한다.
let reduce = false;
let eco = false;
export function setReduceMotion(v) { reduce = !!v; }
export function setEco(v) { eco = !!v; }
export function ecoMode() { return eco; }
export function reducedMotion() { return reduce || eco; }
