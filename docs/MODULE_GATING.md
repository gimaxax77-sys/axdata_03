| shop | ✅ | — | ✅ | ✅ | ✅ | BM · 탭 게이트 || intimacy | ✅ | ✅ | ✅ | 🟡 | ✅ | 친밀도 · UI는 씨앗과 공유(로직만) || costumes | ✅ | — | ✅ | ✅ | ✅ | 외형(전투 무관) || summon | ✅ | ✅ | ✅ | ✅ | ✅ | 소환 숙련 |<!-- 모듈 on/off 옵션화(P0) 표준 패턴 + 진행 체크리스트 -->
# 모듈 게이팅 (on/off 옵션화) — 표준 패턴

> 목표: 기본 요소 외 모든 모듈을 `isOn('<key>')`로 실제로 껐다 켤 수 있게.
> 모범: `elements`·`rarity`(조기 반환) → 이 패턴을 나머지 모듈에 복제.
> 배경·진단: [`SYSTEM_AUDIT.md`](./SYSTEM_AUDIT.md) P0.

## 4게이트 (모듈마다 점검)

| 게이트 | 무엇 | 방법 |
|---|---|---|
| **(a) 로직** | 액션 함수가 off면 no-op | 함수 첫 줄 `if (!isOn('k')) return { ok:false, reason:'비활성' };` |
| **(b) 파워/효과** | 전투·수입 기여 제거 | 기여 계산 함수가 off면 **중립값** 반환(배수 1, 합 0) |
| **(c) 상태** | 세이브 필드 | **보존**(삭제 X). off여도 남겨 다시 켜면 복원 |
| **(d) UI** | 화면 노출 | 섹션/탭을 `{isOn('k') && (…)}`로 감쌈 |

> 핵심은 **(b)**: 기여가 한 곳(예: `accountMods`가 쓰는 `relicMods`)으로 모이면
> 그 함수만 중립 반환시켜도 전 시스템에서 효과가 사라진다.

## 워크드 예제 — `relics` (커밋 acbdeec)

```js
// (b)+(a) relics.mjs
import { isOn } from './features.mjs';
export function relicMods(state) {
  if (!isOn('relics')) return { power: 1, currency: 1, growth: 1 }; // 중립
  …
}
export function upgradeRelic(state, id) {
  if (!isOn('relics')) return { ok: false, reason: '유물 비활성' }; // 차단
  …
}
```
```jsx
// (d) GrowthPanel.js
{isOn('relics') && ( <Card>…유물 섹션…</Card> )}
```
```js
// 검증 relics.test.mjs — FEATURES.relics 토글로 on/off 양쪽 단언(끝에 복원)
```

## 검증 규약 (모듈마다)
1. `relics.test.mjs`처럼 on(기여 있음)/off(중립·차단·상태보존) 양쪽 테스트.
2. `FEATURES.<k>` 토글은 **try/finally로 반드시 복원**(다른 테스트 오염 방지).
3. `node --test system/test/*.test.mjs` 전체 green.
4. UI 게이트는 esbuild 문법 + (가능하면) 실앱에서 off 시 섹션 숨김 확인.

## 진행 체크리스트 (16 → )

| 모듈 | (a)로직 | (b)파워/효과 | (c)상태 | (d)UI | 테스트 | 기여 진입점(메모) |
|---|:--:|:--:|:--:|:--:|:--:|---|
| relics | ✅ | ✅ | ✅ | ✅ | ✅ | `relicMods` → accountMods |
| emblems | ✅ | ✅ | ✅ | ✅ | ✅ | `emblemMods` → accountMods |
| guardians | ✅ | ✅ | ✅ | ✅ | ✅ | `guardianMods` → accountMods |
| pets | ✅ | ✅ | ✅ | ✅ | ✅ | `petMods` → accountMods |
| runes | ☐ | ☐ | ☐ | ☐ | ☐ | 유닛 modifiers + `runeAccount?` |
| sigweapon | ☐ | ☐ | ☐ | ☐ | ☐ | 유닛 modifiers |
| gear | ☐ | ☐ | ☐ | ☐ | ☐ | 유닛 modifiers(핵심 축 — 신중) |
| gacha | ☐ | ☐ | ☐ | ☐ | ☐ | 획득 경로(off면 다른 획득?) |
| summon | ☐ | ☐ | ☐ | ☐ | ☐ | 소환 숙련 |
| costumes | ☐ | ☐ | ☐ | ☐ | ☐ | 외형(전투 무관) |
| intimacy | ☐ | ☐ | ☐ | ☐ | ☐ | 유닛 스탯 + 씨앗 bond 조건 |
| arena | ✅ | — | ✅ | ✅ | ✅ | 콘텐츠(경쟁 탭) · 패시브파워 없음 |
| guild | ✅ | — | ✅ | ✅ | ✅ | 콘텐츠(경쟁 탭) |
| tower | ✅ | — | ✅ | ✅ | ✅ | 콘텐츠(경쟁 탭) |
| season | ✅ | — | ✅ | ✅ | ✅ | 콘텐츠(이벤트 탭) |
| events | ✅ | — | ✅ | ✅ | ✅ | 콘텐츠(이벤트 탭) |
| shop | ☐ | ☐ | ☐ | ☐ | ☐ | BM |
| (완료) elements | ✅ | ✅ | — | ✅ | ✅ | `affinity` 조기반환 |
| (완료) rarity | ✅ | ✅ | — | ✅ | ✅ | `seed`/표시 |

> ⚠️ 상호의존 주의: `intimacy` off면 씨앗 `bond` 조건이, `sigweapon` off면 `oath` 조건이
> 영향받는다(seed.mjs). 파워 축 모듈을 끌 때 **씨앗 조건·전투 스탯 연쇄**를 함께 점검할 것.
> `gear`는 유닛 파워의 핵심이라 off 시 밸런스 영향이 크다 — 후순위·신중.
