<!-- 캐릭터 아트 전략(저비용·고퀄) + 에셋 조사·유효성 검증 -->
# 캐릭터 아트 전략 — 저비용·고퀄 (2026-07 조사)

> **요약**: AI 전면 생성은 비용·일관성 문제로 비추천. 이미 확정한 **CC0 3D 프리렌더**를
> 유지하고, AI는 **무료 로컬 "스타일 보정"** 으로만 얹어 비용 ≈0에 퀄을 올린다.
> 관련 문서: [`ART_PIPELINE_3D.md`](./ART_PIPELINE_3D.md), [`PIXEL_ASSETS.md`](./PIXEL_ASSETS.md)
>
> ⚠️ 3D 렌더·로컬 AI 실행은 **PC(GPU) 작업**이다(원격 컨테이너 불가). 이 문서는 전략·조사 기록.

---

## 1. 3-레인 전략 (개요)

### 왜 AI 전면 생성이 부담인가
- **비용 누적**: 클라우드 AI 장당 ~$0.01–0.08. 28영웅 × 등급/속성색 × 포즈(대기·공격·피격·사망) × 재시도 = 수천 장 → 비용 급증.
- **일관성**: 같은 캐릭터를 다른 포즈로 뽑으면 얼굴·복장이 미묘하게 바뀜(수집형에 치명적).
- **재현 불가**: "다시" 할 때마다 또 과금, 결과가 매번 달라 통제 불가.

### 3개 레인으로 나눠 쓰기

| 레인 | 방식 | 비용 | 퀄 | 일관성 | 용도 |
|---|---|:---:|:---:|:---:|---|
| **A. 3D 프리렌더 (현행)** | KayKit 3D → Blender 스프라이트 시트 | **0** | 중상 | ★★★ | 전 캐릭터·전 포즈 대량 |
| **B. AI 스타일 보정 (로컬)** | A의 렌더 → ComfyUI img2img+ControlNet+IPAdapter | **0**(전기값) | 상 | ★★★ | 퀄 업그레이드 패스 |
| **C. 유료 AI (표적)** | 소수 고가치만(대표 키비주얼) | 소액 | 상 | ★ | 스토어/광고 한정 |

**핵심**: 레인 B가 요점. 이미 만드는 **공짜 3D 렌더를 "밑그림"** 으로 삼아 로컬 AI로 **화풍만** 입힌다.
구조(포즈·실루엣)는 3D가 고정 → 일관성 유지, AI는 스타일만 → 장당 과금 없음.

### 비용 비교 (영웅 28종 기준, 대략)
| 접근 | 초기 노력 | 장당 비용 | 대량 확장 |
|---|---|:---:|:---:|
| 전면 클라우드 AI | 낮음 | $0.01–0.08 | 💸💸💸 |
| **3D 프리렌더 + 로컬 AI 보정** | 중간(1회 셋업) | **≈0** | ✅ 반복 무료 |

---

## 2. Blender 렌더 품질 튜닝 (레인 A 강화)

파이프라인은 그대로, **설정만** 조정해 퀄을 올린다.

| 항목 | 권장 설정 | 이유 |
|---|---|---|
| **엔진** | EEVEE(Next) | 토ون·속도에 적합. 사실광이 필요하면 Cycles. |
| **카메라** | **Orthographic** + 캐릭터별 동일 각도·프레이밍(정면 또는 ¾) | 스프라이트 크기·시점 통일(전투는 좌우 대치). |
| **라이팅** | 3점: 키(상단 정면) + 필(반대 약하게) + **림/백라이트** | 림이 배경과 실루엣을 분리 → 또렷함. |
| **셰이딩** | 셀/토ون 셰이더(그라디언트 램프) | KayKit 아틀라스 화풍과 일관. |
| **외곽선** | Freestyle 라인 **또는** inverted-hull(Solidify+뒤집힌 노멀) | 캐릭터 윤곽 강조(2D 감). |
| **그림자** | 부드러운 접지 그림자 또는 **타원 그림자 스프라이트 분리** | 바닥 고정감, 시트 재사용 쉬움. |
| **해상도(안티에일리어싱)** | 목표의 **2배로 렌더 후 다운샘플**(SSAA) | 계단현상 제거 → 선명. 픽셀아트면 정수배 렌더 후 nearest. |
| **배경** | Film ▸ **Transparent** ON | 투명 PNG(엔진 폴백/합성). |
| **색관리** | View Transform = **Standard**(Filmic/AgX 지양) | 토ون 색 왜곡 방지, 팔레트 그대로. |
| **시트 출력** | Sprite Sheet Maker: 균일 프레임·orthographic·행 라벨 | 프레임 크기 일관, 엔진 배선 쉬움. |

**MVP 최소 셋**: `Idle · Attack(원형별 1) · Hit · Death` 4종만 렌더해도 전투 성립(문서 §3 참고).

---

## 3. 로컬 AI 스타일 패스 — ComfyUI (레인 B)

3D 렌더(밑그림)에 일러스트 화풍을 입히되 **구조는 유지**한다.

### 준비물
- **툴**: [ComfyUI](https://github.com/comfyanonymous/ComfyUI) (무료·로컬).
- **하드웨어**: CUDA GPU **8GB VRAM**(SD1.5) ~ **12GB**(SDXL). RTX 3060급 OK.
- **모델**: 체크포인트(원하는 화풍) + ControlNet(lineart/depth) + IPAdapter + (선택)ADetailer.

### 워크플로 (노드 흐름)
```
Load Image (3D 렌더 512)
   ├─▶ ControlNet Preprocessor (Lineart 또는 Depth)  → 구조 고정
   └─▶ IPAdapter (기준 화풍 1장)                      → 스타일 일관
        └─▶ KSampler (img2img, denoise 0.35~0.55)     → 화풍 입히기
             └─▶ ADetailer (얼굴 디테일 보정)
                  └─▶ Save Image (512 PNG, 투명 유지)
```
- **denoise 팁**: 낮게(0.35~0.5) = 3D 구조·포즈 강하게 유지(권장). 높이면 화풍은 세지만 캐릭터 이탈 위험.
- **일관성 강화**:
  - 무학습(빠름): **IPAdapter FaceID + ControlNet** 조합 → 80~95% 일관.
  - 최고(near-100%): 대표 캐릭 1인당 **LoRA를 10~20장으로 1회 학습**.

### 우리 코드와 연동
결과 512 PNG를 `assets/char/<concept>/<id>.png` 로 저장하면 **`app/charImages.js` 폴백 설계 덕에 자동 반영**(로스터·파티·소환·도감 전역). 마음에 안 들면 같은 경로 덮어쓰기만 하면 됨 → 리스크 0.

---

## 4. 게임 에셋 심층 조사 + 기존 문서 유효성 검증 (2026-07)

기존 `ART_PIPELINE_3D.md`·`PIXEL_ASSETS.md`에 적힌 에셋을 재확인했다. **결론: 전략은 여전히 유효하며, 일부는 업데이트·정정이 필요하다.**

| 에셋 | 종류 | 라이선스 | 비용 | 현재 상태 | 비고/정정 |
|---|---|---|---|---|---|
| **KayKit Adventurers** | 3D 캐릭(모듈러) | **CC0**(무출처·상업 OK) | 무료 | ✅ 유효 | .FBX/.GLTF, 1024 아틀라스. 정확한 바디/무기 수는 현재 itch 페이지에서 재확인(버전별 상이). |
| **KayKit Character Animations** | 3D 애니 클립(동일 리그) | **CC0** | 무료 | ✅ 유효 | 클립 수는 버전 갱신됨 → 페이지 확인. 리타게팅 불필요(동일 휴머노이드). |
| **Sprite Sheet Maker** | Blender 3D→2D 시트 | 무료 | 무료 | ✅ 유효·**업그레이드** | **이제 공식 Blender Extension.** 최신 **v5.2.3(2026-07, Blender 5.1+)**, Blender 4.2 LTS는 **v4.0.2**. (기존 문서의 "GitHub·Blender 4.x" → 갱신 필요.) |
| **Beowulf RPG Heroes & Classes** | 2D 픽셀 캐릭 | 상업 OK, **재배포·재판매·인쇄물 금지** | **유료 최소 $15** | ⚠️ 정정 | 144종 **정적(static) 스프라이트**, 16클래스, 64/128/256px(437파일). **애니 없음** → 초상/도감용, 전투 애니는 별도 필요. 기존 "상업 허용"은 맞으나 **무료 아님**. |
| **Mana Seed "Character Base"** (Seliel the Shaper) | 2D 모듈러 베이스 | User License(페이지 확인) | **베이스 무료** | ✅ 유효 | 페이퍼돌(레이어 장비) 모듈러 → 2D판 KayKit. 무료 베이스 + 유료 확장. 2D 픽셀 경로 택할 때 강력. |
| **Cyangmou 계열 몬스터** | 2D 픽셀 몬스터 | 상업(페이지 확인) | 유료 | ✅ 유효 | 유명 픽셀 아티스트, 고퀄. 정확한 팩·수량은 페이지 확인. |

### 기존 문서 대비 바뀐 점(요약)
1. **Sprite Sheet Maker**: GitHub 애드온 → **공식 Blender Extension v5.2.3**. 설치처·Blender 버전 표기 갱신 권장.
2. **Beowulf 팩**: "상업 허용"은 유지되나 **유료($15)·정적 스프라이트**임을 명시(애니 별도). 재배포 금지 조항 주의.
3. **핵심 전략(CC0 3D→2D 프리렌더)**: **여전히 유효**하고, 렌더 도구가 공식화되어 오히려 더 안정적.

---

## 5. 실행 순서 & 체크리스트

- [ ] **1단계(지금·PC)**: 레인 A로 MVP 4포즈(대기·공격·피격·사망)를 전 캐릭터 렌더. §2 튜닝 적용.
- [ ] **2단계(PC)**: 대표 캐릭 3~5종에 레인 B(ComfyUI) 스타일 패스 시험 → `charImages.js` 폴백 경로로 덮어 A/B 비교.
- [ ] **3단계**: 만족 시 레인 B 전체 배치 + 텍스처 리컬러로 수집형(속성/등급) 확장(AI 없이).
- [ ] **한정**: 스토어/광고 키비주얼만 레인 C(유료 AI).
- [ ] 렌더 도구는 **Sprite Sheet Maker 최신 버전**(Blender 버전에 맞게) 설치.

---

## 참고(Sources)
- KayKit(Kay Lousberg): https://kaylousberg.itch.io/kaykit-adventurers · https://kaylousberg.itch.io/kaykit-character-animations
- Sprite Sheet Maker(공식 Extension): https://extensions.blender.org/add-ons/sprite-sheet-maker/
- Beowulf RPG Heroes & Classes: https://beowulf.itch.io/rpg-heroes-classes-pixel-art-huge-pack
- Mana Seed(Seliel the Shaper): https://seliel-the-shaper.itch.io/character-base
- SD 캐릭터 일관성(2026): https://thinkpeak.ai/stable-diffusion-character-consistency-tutorial/
- 3D→2D 스타일 전환(ControlNet+IPAdapter): https://www.instasd.com/post/sdxl-style-transfer-with-ipadapter-and-controlnet
