# 3D→2D 프리렌더 아트 파이프라인 (경로 Y1 · CC0 무료)

> **목표**: 3D 모듈러 캐릭터를 애니메이션과 결합해 **2D 스프라이트 시트로 구워** 우리 기존 2D 엔진에 얹는다.
> "28영웅 애니"를 소수 바디 + 공유 애니 + 색/무기 변형으로 해결(런타임 3D 부담 0).
> 배경·근거: `docs/PIXEL_ASSETS.md §10`.
>
> ✅ **결정(2026-07): 베타 화풍 = 경로 Y (3D 토ون · KayKit CC0)로 확정.** 톤 충돌은 그레이딩으로 방어(프리뷰 검증).

---

## 0. 지금 손에 있는 것 (전부 CC0 무료)

| 요소 | 팩 | 내용 | 라이선스 |
|---|---|---|---|
| 캐릭터 | **KayKit Adventurers 2.0** | 6바디 + 모듈러 무기 | CC0 |
| 애니메이션 | **KayKit Character Animations 1.1** | 161클립(같은 리그) | CC0 |
| 렌더 도구 | **Sprite Sheet Maker** (Blender) | 3D→2D 시트 렌더 | 무료(GitHub) |

→ **리타게팅 불필요**(캐릭·애니 동일 휴머노이드 리그). 남은 건 Blender 렌더(PC) + 엔진 배선(원격).

---

## 1. 확보 캐릭터·무기 (실측)

- **바디 6종**: Knight · Barbarian · Ranger · Rogue · Rogue_Hooded · Mage
- **주무기 11종**: 근접5(sword_1h·sword_2h·axe_1h·axe_2h·dagger) · 원거리3(bow·crossbow_1h·crossbow_2h) · 마법3(wand·staff·spellbook)
- **방패 5종**: round · badge · spikes · square · barbarian
- **팔레트**: 텍스처 1장 리컬러 → 색 무제한(실용 6~8색 = 속성/등급)

---

## 2. 조합별 영웅 생성 표 ★

무엇을 "다른 영웅"으로 치느냐에 따라 3단계.

| 기준 | 계산식 | 생성 수 | 용도 |
|---|---|---|---|
| **① 고유 실루엣** | 6바디 × 어울리는 무기(~4) × 방패유무 | **≈ 24~40** | "진짜 다르게 보이는" 영웅 |
| **② 수집 변형** | ①(~30) × 속성/등급 색 6종 | **≈ 150~200** | 가챠식(같은 몸·다른 속성=다른 카드) |
| **③ 이론적 최대** | 6 × 11 × (5방패+무) × 6색 | **≈ 2,000+** | 숫자상 상한(대부분 중복감) |

**결론**: **우리 28 로스터는 ①만으로 여유 커버**. 수집형으로 넓히면 100+ 가능. ③은 의미 없음.

### 원형 × 캐릭터 × 무기 매핑

| 우리 원형 | KayKit 바디 | 무기 | 방패 |
|---|---|---|---|
| STRIKER(근접딜) | Barbarian · Rogue · (검사) | sword/axe/dagger | – |
| VANGUARD(탱커) | Knight | sword_1h | round/square/badge |
| SUPPORT(마법) | Mage | wand/staff/spellbook | – |
| 원거리(옵션) | Ranger | bow/crossbow | quiver |

---

## 3. 애니 클립 → 게임 상태 매핑

우리 전투 상태에 필요한 클립(KayKit Animations, Rig_Medium 기준):

| 게임 상태 | KayKit 클립 | 프레임(권장) |
|---|---|---|
| 대기(idle) | `Idle_A` / `Idle_B` | 8~12 |
| 공격·근접 | `Melee_1H_Attack_Slice_Diagonal` · `_Chop` · `_Stab` (2H·듀얼윌드 별도) | 8~10 |
| 공격·마법 | `Ranged_Magic_Spellcasting` · `Magic_Shoot` · `Magic_Summon` | 10~14 |
| 공격·원거리 | `Ranged_Bow_Draw` → `Bow_Release` | 8~10 |
| 방어(탱커) | `Melee_Blocking` · `Melee_Block` | 4~8 |
| 피격 | `Hit_A` / `Hit_B` | 4~6 |
| 사망 | `Death_A` / `Death_B` | 10 |
| 등장(소환) | `Spawn_Ground` / `Spawn_Air` | 8~12 |
| **적 전용(보너스)** | `Skeletons_Awaken` · `Skeletons_Idle` · `Walking` · `Death` | – |

> 최소 셋(MVP): **Idle · Attack(원형별 1) · Hit · Death** 만 렌더해도 전투가 성립.

---

## 4. 프리렌더 파이프라인 (PC · Blender)

> ⚠️ 3D 렌더는 GPU/Blender 필요 → **PC 작업**(원격 컨테이너 불가, APK 빌드와 동일 성격).

1. **Blender 준비** — Blender 4.x + [Sprite Sheet Maker](https://github.com/ManasMakde/SpriteSheetMaker) 애드온 설치.
2. **캐릭터 로드** — `KayKit Adventurers/Characters/gltf/<Body>.glb` import.
3. **애니 적용** — `KayKit Animations/Animations/gltf/Rig_Medium/*.glb`의 클립을 캐릭 아마추어에 연결(같은 리그라 바로 붙음).
4. **무기 장착** — `Assets/gltf` 무기 메시를 손 본에 페어런팅(원형별 무기 교체).
5. **카메라 고정** — **측면(side) 또는 3/4 뷰**로 고정(우리 좌우 대치 전투). 정사영(Orthographic) 권장.
6. **상태별 렌더** — Idle/Attack/Hit/Death를 각각 스프라이트 **가로 스트립**으로 출력.
7. **팔레트 변형** — 텍스처 색만 바꿔 속성/등급 변형 재렌더(또는 엔진 팔레트 매핑으로 대체 — `docs` 팔레트 데모 참조).

### 출력 규격 (제안)

| 항목 | 값 |
|---|---|
| 프레임 크기 | **128×128** (또는 96×96) · 정사영 · 투명 배경(PNG) |
| 시트 형태 | 상태별 **가로 스트립**(1행 N프레임) |
| 바라보는 방향 | **오른쪽**(적은 엔진에서 좌우 반전) |
| 파일명 | `<hero>_<state>.png` 예: `knight_idle.png` · `mage_attack.png` |
| 배치 경로 | `assets/units/<concept>/<hero>/` |

→ 이 규격으로 주시면 **우리 초상 레지스트리처럼 자동 매핑** 되도록 배선하겠습니다.

---

## 5. 엔진 배선 (원격 · 내가 담당)

- **스프라이트 상태머신**: idle↔attack↔hit↔death 를 전투 이벤트로 전환(현 `PixelIdleScreen`의 steps() 애니 방식 확장).
- **레지스트리**: `assets/units/...` 경로 규칙으로 캐릭↔스프라이트 자동 연결(폴백=현 이모지/초상 유지).
- **팔레트 변형**: 색 변형을 재렌더 대신 엔진 팔레트 매핑으로 대체 가능(비용↓).
- **컷인/VFX**: 궁극기 컷인·속성 이펙트는 코드(데모 검증 완료).

---

## 6. 용량 가이드 (업로드/전송)

| 대상 | 용량 | 전송 |
|---|---|---|
| KayKit CC0 원본(캐릭+애니) | 13~15MB | ✅ 업로드 OK(실측) |
| 렌더 결과 스프라이트(캐릭당) | 수백KB~수MB | ✅ 가벼움 |
| Synty 등 대형 3D 원본 | 수백MB~1GB+ | ❌ 업로드 부적합 |

**원칙**: 무거운 **3D 원본은 PC에 두고**, **렌더된 2D 스프라이트만** 주고받는다. (스프라이트는 가벼워 업로드·빌드 부담 없음)

---

## 7. 로스터 확장 (6바디 한계 돌파)

| 추가 소스 | 효과 | 비용 | 링크 |
|---|---|---|---|
| Quaternius Modular(CC0) | 62파츠 조립 → 수백 바디 | 무료 | https://quaternius.itch.io/modular-character-outfits-fantasy |
| KayKit 유료 티어(EXTRA/SOURCE) | 바디·파츠 추가 | $ | https://kaylousberg.itch.io/kaykit-adventurers |
| Synty POLYGON | 120프리메이드+720파츠 | $$ | https://syntystore.com/products/polygon-modular-fantasy-hero-characters |

→ **Quaternius(무료) 병합** 시 ① 기준 고유 영웅 **50~100+**.

---

## 8. 다음 액션

- [x] **화풍 확정**: ✅ 경로 Y(3D 토ون) — 베타로 결정(2026-07).
- [ ] **PC**: §4 파이프라인으로 **MVP 4상태(Idle/Attack/Hit/Death) 1캐릭(예: Knight) 렌더** → 규격 확인 → 스프라이트 업로드.
- [ ] **원격(진행 중)**: 엔진측 스프라이트 파이프라인 골격(`spriteAnim.mjs` 순수 로직 + `SpriteAnim` 컴포넌트 + `unitSprites` 레지스트리) — 스프라이트 없으면 기존 초상/이모지 폴백.
- [ ] MVP 스프라이트 도착 → 실데이터로 컴포넌트 검증 → `PixelIdleScreen` 배선.
- [ ] 규격 OK → 6바디 × 상태 렌더 → `assets/units/` 배치 → play.html 미리보기 → 빌드.

**참고 데모(세션 아티팩트)**: 정적+VFX · 컷아웃 리깅 · 1rig 3영웅 컷인 · 팔레트 매핑 비교.

---

## 9. 리스크 & 관리 포인트 (3D 화풍 적용 시)

3D→2D 프리렌더로 가되, 실시간 3D는 안 쓰므로 RN/Expo 통합 리스크는 회피됨. 남는 리스크는 아래.

### 리스크 요약 (심각도 순)

| 리스크 | 심각도 | 관리 포인트 |
|---|---|---|
| **앱 용량 폭증** | 🔴 높음 | MVP 4상태만 · 아틀라스 압축 · 에셋 번들 분리/OTA 지연로드 · 색변형은 엔진 팔레트 매핑(재렌더 X) |
| **화풍 충돌**(밝은 토ون ↔ 다크판타지) | 🔴 높음 | Blender 조명·컬러그레이딩을 게임 팔레트에 맞춤 + 배경/초상 통일 방침 확정 |
| **PC 의존 워크플로**(아트 추가마다 렌더) | 🟡 중간 | Blender 파이썬 배치 스크립트로 자동화 · 아트 추가는 주기적 배치잡 |
| **"KayKit 티"**(흔한 무료 에셋=차별성↓) | 🟡 중간 | 텍스처 리컬러·비율·장비 커스텀으로 고유화 |
| **6바디 반복감** | 🟡 중간 | 실루엣(무기·후드·체형) 차별 + 팔레트 규칙 |
| **프레임 정합성**(전환 시 튐) | 🟡 중간 | 피벗·프레임크기·그림자 기준을 MVP서 고정 후 전량 동일 세팅 |
| 저사양 기기 메모리 | 🟢 낮음 | 프레임수 절제 · 필요 캐릭만 로드 |
| 실시간 3D 호환 | 🟢 낮음(회피) | 프리렌더라 우리 2D 엔진 그대로 |

### 최대 함정 2가지

1. **용량** — 128×128 × 다프레임 × 다상태 × 다캐릭 = 수십~수백MB. 현재 `play.html` 7.3MB 위에 얹으면 APK 이탈 위험.
   → 설계로 방어: MVP 4상태(Idle/Attack/Hit/Death) · 아틀라스 · OTA 지연로드 · 색변형=엔진 팔레트 매핑.
2. **화풍 충돌** — KayKit 토ون은 밝고 귀여움, 우리는 다크판타지. 캐릭만 밝고 배경만 어두우면 붕 뜸.
   → Blender 조명/컬러그레이딩으로 톤 맞춤 + **전투·카드·배경을 같은 화풍으로 통일**(하이브리드면 불일치).
   → 참고: KayKit 공식 프로모도 다크 네이비 배경 → 토ون이 어두운 톤에서 의외로 잘 읽힘(리스크 완화 요인).

### 종합 관리 원칙
1. **규격 먼저 고정**(MVP 1캐릭: 카메라각·프레임크기·피벗·정사영·그림자) → 자동화 배치 렌더 → 전량.
2. **용량은 설계로 방어**(4상태·아틀라스·OTA·팔레트매핑).
3. **톤 통일 결정**(캐릭/배경/초상 같은 화풍) — 화풍 충돌이 최대 함정.
