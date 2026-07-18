<!-- 영웅 스프라이트 제작 실전 순서(KayKit 3D → Blender → 2D PNG) -->
# 영웅 스프라이트 공장 — 실전 순서 (KayKit → Blender → 2D)

> **한 줄 요약**: KayKit 3D 몸 + 애니메이션을 Blender에서 2D PNG로 구워 우리 2D 엔진에 얹는다.
> 첫 한 명만 익히면, 나머지는 **몸·동작·색만 바꿔 반복**하면 된다.
> 관련: [`ART_STRATEGY.md`](./ART_STRATEGY.md) · [`ART_PIPELINE_3D.md`](./ART_PIPELINE_3D.md) · [`PIXEL_ASSETS.md`](./PIXEL_ASSETS.md)
>
> ⚠️ 3D 렌더는 **PC(GPU) 작업**이다(원격 컨테이너 불가).

---

## 0. 준비물 (1회만)

| 항목 | 버전/위치 | 비고 |
|---|---|---|
| Blender | **4.2 LTS** | blender.org/download/lts |
| Sprite Sheet Maker | **v4.0.2** (Blender 4.2용) | Blender 확장. 5.x용 5.2.3과 헷갈리지 말 것 |
| KayKit Adventurers | 몸(Knight 등) + 무기 | `Characters/gltf/` 에 몸 파일 |
| KayKit Character Animations | 동작 묶음 | `Animations/gltf/Rig_Medium/` 에 동작 `.glb` |

---

## 1. 영웅 한 명 뽑는 순서 (핵심 SOP)

> 목표: **색·갑옷 있는 기사**가 **대기(Idle)** 자세로 나온 2D PNG.

1. **새 장면** — `File → New → General` → `Don't Save` → 큐브 클릭 → `X → Delete`.
2. **기사 몸 불러오기** — `File → Import → glTF 2.0` → `KayKit Adventurers.../Characters/gltf/Knight.*`.
3. **동작 불러오기** — 다시 Import → `KayKit Character Animations.../Animations/gltf/Rig_Medium/Rig_Medium_General.glb`.
   - 이때 **회색 밑몸이 하나 더** 생긴다(곧 숨긴다).
4. **회색 밑몸 숨기기** — Outliner에서 두 번째 `Rig_Medium.001`(General이 데려온 것)의 **눈 아이콘(👁)** 클릭 → 화면에 **기사만** 남긴다.
5. **렌더 방식** — Render 탭 → **Engine: Workbench** · **Lighting: Flat** · **Color: Texture**.
   - (EEVEE는 조명 때문에 어둡게/까맣게 나오기 쉽다. Workbench가 균일하고 스프라이트에 적합.)
6. **Sprite Sheet Maker** (뷰포트에서 `N` → SpriteSheetMaker 탭):
   - **Animation Strips**의 `+` → 행 1개.
   - **Capture Items**의 `+` → 항목 1개. *(행을 먼저 만들어야 `+`가 켜진다.)*
   - **Object** = 첫 번째 `Rig_Medium`(= **기사** 뼈대).
   - **Action** = 이름에 **`Idle`** 들어간 것. *(General에서 온 동작이라 목록에 있음.)*
7. **카메라** — Camera Settings → **`☑ Consider Armature Bones`** → **`Create Auto Camera`**.
   - (대상이 뼈대라 이 옵션을 켜야 캐릭터 크기에 맞게 잡힌다. 안 켜면 점처럼 작게 나온다.)
8. **굽기** — **`Create Single Sprite`**(한 장) 또는 **`Create Sprite Sheet`**(동작 여러 프레임).
   - 지정한 **Output Folder**에 PNG 생성.

---

## 2. 우리가 겪은 함정 & 팁 (중요)

- **애니메이션은 "한 번에 하나만"** 불러온다. 여러 파일을 한꺼번에 불러오면 캐릭터가 **여러 개 겹쳐**(예: 9개) 렌더가 엉망이 된다.
- **Capture Items `+`가 회색**이면 → 먼저 **Animation Strips에 행**을 만든다.
- **애니 파일 몸은 회색 밑몸**이다(색·갑옷 없음). 그래서 **기사 몸을 따로 불러와 씌우고**, 밑몸은 숨긴다.
- **까맣게/어둡게 나오면** → 조명 문제. **Workbench + Flat**로 해결. (또는 World Strength ↑.)
- **너무 작게(점) 나오면** → `Consider Armature Bones` 켜고 `Create Auto Camera` 다시.
- **뼈대 공유**: KayKit 몸과 동작은 같은 `Rig_Medium` 뼈대라, 한 동작을 다른 몸에 씌울 수 있다(그래서 기사에 General의 Idle을 씌움).

> ⏳ 오늘 밤 PC 작업에서 **1번 SOP의 4·6·8단계(밑몸 숨기기 / 기사 뼈대 지정 / 굽기)** 를 함께 최종 검증한다.

---

## 3. "반복 공장" — 나머지는 이걸 반복

영웅 1명이 되면, 아래만 바꿔 **같은 순서를 반복**한다.

### 무엇을 반복하나
| 축 | 바꾸는 것 | 방법 |
|---|---|---|
| **몸** | Knight → Barbarian·Ranger·Rogue·Rogue_Hooded·Mage | 2단계에서 다른 몸 파일 |
| **동작** | Idle → 공격·피격·사망 | 6단계 Action을 바꿔 다시 굽기 |
| **색(속성/등급)** | 같은 몸 색 변형 | **텍스처 리컬러**(다시 렌더 불필요) |

### 동작 매핑(최소 셋, MVP)
| 게임 상태 | KayKit 클립(예) |
|---|---|
| 대기 | `Idle` |
| 공격 | `Melee`/`Magic`/`Bow` 계열 1개 |
| 피격 | `Hit` |
| 사망 | `Death` |

→ 영웅 28종 × 4동작이면 대량이지만, **한 번 손에 익으면 빠르다.** `Create Sprite Sheet`로 한 동작의 여러 프레임을 한 번에 굽는다.

---

## 4. 이 방법이 **커버하지 않는 것** (별도 소스)

| 무엇 | 어디서 |
|---|---|
| 몬스터·적 | KayKit 다른 팩(해골 등) / 별도 몬스터 에셋 |
| UI·버튼·HP바·아이콘 | 픽셀 UI/아이콘 팩 (`PIXEL_ASSETS.md`) |
| 이펙트·배경 | 별도 에셋 또는 제작 |

즉 **영웅 캐릭터는 이 공장으로, 나머지는 조합**으로 채운다.

---

## 5. 품질 한 단계 더 (선택 · 나중)

- 렌더 튜닝(외곽선·2배 슈퍼샘플 등)은 [`ART_STRATEGY.md` §2](./ART_STRATEGY.md).
- 3D 렌더에 **AI 스타일 보정(레인 B, ComfyUI)** 을 얹는 법은 [`ART_STRATEGY.md` §3](./ART_STRATEGY.md).

---

## 6. 엔진 연결 (렌더 후)

구운 PNG를 `assets/char/<concept>/<id>.png` 규격으로 저장하면, `app/charImages.js`에 한 줄 등록으로 로스터·파티·소환·도감 전역에 반영된다(폴백 설계). 자세히는 `app/charImages.js` 주석 참고.

---

## 체크리스트
- [ ] (오늘 밤) 기사 1명 완성 — SOP 1번 끝까지 검증
- [ ] 몸 6종 각 Idle 1장씩
- [ ] 동작 4종(대기·공격·피격·사망) 매핑 확정
- [ ] 색 변형(속성/등급) 리컬러 규칙 정하기
- [ ] 몬스터·UI는 별도 트랙으로 (`PIXEL_ASSETS.md`)
