<!-- A1(3D 렌더 → 게임 반영) 현황 + 재렌더가 코드수정 없이 반영되는 배선 계약 -->
# A1 아트 반영 현황 & 재렌더 가이드

> 결론: **A1(판타지 21종 3D 스프라이트 게임 반영)은 이미 100% 완료.** 배선할 것 없음.
> 남은 아트 작업(A2 품질 재렌더 등)은 **같은 경로에 덮어쓰면 코드 수정 없이 반영**된다.
> 상세 제작 순서는 중복하지 않는다 → [`SPRITE_WORKFLOW.md`](./SPRITE_WORKFLOW.md)·[`ART_STRATEGY.md`](./ART_STRATEGY.md) 참조.

## 1. 현황 점검 (2026-07-18)

| 항목 | 상태 |
|---|---|
| 판타지 로스터 캐릭터 | 21종 |
| 스프라이트 보유 | **21/21 전원** (간극 0) |
| 상태별 PNG | idle·attack·hit·walk **4종 완비** (총 84 PNG) |
| 배선 | `app/unitSprites.js`에 `fantasy:<id>` 21키 등록, 로스터 id와 정확히 일치 |
| SF(scifi) 컨셉 | ❌ 유닛 스프라이트 없음 → 이모지 폴백 (SF 제품 낼 때만 필요) |

→ **판타지 제품 기준 A1은 끝. 새로 반영할 렌더가 없다.**

## 2. 자동 배선 계약 (이게 핵심)

게임은 전투에서 파티 유닛을 `{ cid: concept.id, key: u.characterId }`로 만들고
(`app/screens/IdleScreen.js`), 다음 규격 파일을 자동으로 찾는다.

```
assets/units/<concept>/<key>/<key>_<state>.png
  <concept> = fantasy | scifi | enemy
  <key>     = 캐릭터 id (예: knight, mage)
  <state>   = idle | attack | hit | walk   (가로 스트립 16프레임, 128×128/프레임)
```

**따라서 재렌더 결과를 위 경로에 같은 이름으로 덮어쓰면, 코드 한 줄 안 바꿔도 반영된다.**
(등록은 `unitSprites.js`가 이미 갖고 있음. Metro가 정적 `require`를 요구해 목록은 명시적 유지.)

## 3. A2 — 기존 21종 품질 재렌더 (Gim PC·GPU 전용)

품질만 올리는 작업. 파이프라인·경로는 그대로, **렌더 설정만** 조정 → 같은 파일 덮어쓰기 → 앱 재빌드.

1. **렌더 품질 설정 조정** — `axdata_05/scripts/render_sprites.py` 및 Blender 설정.
   권장값은 [`ART_STRATEGY.md`](./ART_STRATEGY.md) §2 표 그대로:
   3점 라이팅+림라이트 · 셀/토ون 셰이더 · 외곽선(Freestyle 또는 inverted-hull) ·
   **2배 렌더 후 다운샘플(SSAA)** · 투명 배경 · View Transform = Standard.
2. **21종 × 4상태 일괄 렌더** — env로 반복:
   `SPRITE_BODIES`, `SPRITE_ACTIONS=Idle,Attack,Hit,Walk`, `SPRITE_OUT` 지정 후
   `blender --background --python scripts/render_sprites.py` (axdata_05 README 참조).
3. **스트립 조립** — 프레임 → 가로 16프레임 스트립: `axdata_05/scripts/assemble_strips.py`.
4. **게임에 덮어쓰기** — 결과를 `assets/units/fantasy/<key>/<key>_<state>.png`로 복사(기존 대체).
5. **확인** — `npm run build:play` 또는 `npx expo export --platform web` 후 전투 화면 육안 확인.
   코드 변경 없음 → 회귀 테스트 불필요(에셋만 교체).

## 4. 새 캐릭터를 추가할 때만 코드 1줄

로스터에 신규 캐릭터를 넣고 스프라이트를 붙이는 경우에만 `unitSprites.js` `SHEETS`에
한 줄(`'fantasy:<newid>': { …4상태 require… }`) 추가한다. 기존 21종 재렌더는 불필요.

## 5. SF(scifi) 스프라이트 (선택)

SF 제품을 출시하려면 scifi 로스터 캐릭터의 3D 렌더가 필요하다(현재 이모지 폴백).
같은 파이프라인으로 렌더 → `assets/units/scifi/<key>/…` 배치 → `unitSprites.js`에 `scifi:` 키 추가.
판타지가 주력이면 후순위로 둬도 무방(폴백이 무해).
