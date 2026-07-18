# 아트 바이블 — 캐릭터 일러스트 제작 가이드

이 문서는 28종 캐릭터(판타지·SF 각 14종)의 **실제 일러스트 제작용 스펙과 생성 프롬프트**입니다.
AI 생성(Midjourney·SDXL·Nano Banana 등)·외주 어느 쪽이든 그대로 전달하면 됩니다.
완성물을 규격대로 저장하면(`assets/char/<concept>/<id>.png`) 앱 전역에 자동 반영됩니다.

---

## 1. 공통 규격 (반드시 준수)

- **해상도/포맷**: 512×512 이상, **투명 배경 PNG** (앱 프레임에 `cover`로 채워짐).
- **구도**: **얼굴~상반신(bust) 중앙 배치**, 얼굴은 상단 1/3에. 프레임이 정사각이라 머리 잘림 주의.
- **일관성**: 14종이 **하나의 게임처럼** 보이도록 동일 렌더 스타일·라인 두께·채색 기법 유지.
- **등급이 읽히게**: 노멀=담백 → 신화=화려. 아래 등급별 FX 위계를 따름.
- **속성이 읽히게**: 속성별 팔레트·모티프를 주조색으로.
- **라이선스**: AI/외주/스토어 어느 경로든 **상업 배포 라이선스** 확인 필수.

## 2. 속성 팔레트 · 모티프

| 속성 | 팔레트 | 모티프 | 이펙트 |
|---|---|---|---|
| FIRE (불) | warm crimson, orange, molten gold | embers, flame aura, heat shimmer, ash particles | licking flames and floating sparks |
| WATER (물/얼음) | cyan, deep blue, frost white | ice crystals, flowing water, frost mist | swirling water ribbons and glinting ice shards |
| WOOD (숲/바람) | emerald green, teal, jade | leaves, vines, wind gusts | spiraling leaves and green wind currents |
| LIGHT (빛) | radiant gold, ivory white, soft amber | halo, feathers, holy runes | radiant light beams and drifting feathers |
| DARK (어둠) | violet, magenta, obsidian black | shadow tendrils, arcane sigils, void | curling shadow smoke and glowing purple runes |

## 3. 아키타입 실루엣

| 역할 | 체형 | 장비 | 포즈 |
|---|---|---|---|
| STRIKER (공격형) | agile, lithe | light armor and a bladed weapon | dynamic aggressive stance, weapon mid-motion |
| VANGUARD (방어형) | broad, sturdy | heavy plate armor and a large shield | grounded protective stance, shield forward |
| SUPPORT (지원형) | graceful, slender | flowing robes and a staff or focus | elegant gesture, calm and poised |

## 4. 등급별 FX 위계

| 등급 | 연출 |
|---|---|
| N (노멀) | minimal effects, plain practical gear, understated |
| R (레어) | modest elemental glow, decorated gear |
| SR (에픽) | strong elemental aura, ornate detailed gear, particle accents |
| SSR (전설) | dramatic elemental FX, glowing runes, rich ornamentation, energy particles |
| UR (신화) | maximal cinematic FX, radiant divine aura, intricate legendary ornamentation, godlike presence, volumetric light |

## 5. 공통 네거티브 프롬프트

```
lowres, blurry, extra limbs, bad anatomy, watermark, text, signature, jpeg artifacts, cropped head, out of frame, multiple characters
```

---

## 6. 캐릭터별 프롬프트

### 판타지 · 엘드리아 연대기

#### 카엘 — 불꽃의 검사 · SSR · 불 · 공격형
`assets/char/fantasy/kael.png` · 성격: 불같은

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "카엘" (불꽃의 검사) — medieval fantasy hero, agile, lithe duelist, wielding light armor and a bladed weapon. Element 불: color palette of warm crimson, orange, molten gold; embers, flame aura, heat shimmer, ash particles; licking flames and floating sparks. Expression/mood: fierce, burning confidence. Rarity SSR (전설): dramatic elemental FX, glowing runes, rich ornamentation, energy particles. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 루나 — 달빛 성녀 · SSR · 빛 · 지원형
`assets/char/fantasy/luna.png` · 성격: 차분한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "루나" (달빛 성녀) — medieval fantasy hero, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 빛: color palette of radiant gold, ivory white, soft amber; halo, feathers, holy runes; radiant light beams and drifting feathers. Expression/mood: serene, gentle composure. Rarity SSR (전설): dramatic elemental FX, glowing runes, rich ornamentation, energy particles. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 그웬 — 서리 수호기사 · SR · 물/얼음 · 방어형
`assets/char/fantasy/gwen.png` · 성격: 과묵한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "그웬" (서리 수호기사) — medieval fantasy hero, broad, sturdy guardian, wielding heavy plate armor and a large shield. Element 물/얼음: color palette of cyan, deep blue, frost white; ice crystals, flowing water, frost mist; swirling water ribbons and glinting ice shards. Expression/mood: stoic, silent resolve. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: grounded protective stance, shield forward. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 시엘 — 바람의 무희 · SR · 숲/바람 · 공격형
`assets/char/fantasy/ciel.png` · 성격: 장난기 많은

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "시엘" (바람의 무희) — medieval fantasy hero, agile, lithe duelist, wielding light armor and a bladed weapon. Element 숲/바람: color palette of emerald green, teal, jade; leaves, vines, wind gusts; spiraling leaves and green wind currents. Expression/mood: playful smirk, mischievous. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 브란 — 대지의 방패 · R · 숲/바람 · 방어형
`assets/char/fantasy/bran.png` · 성격: 든든한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "브란" (대지의 방패) — medieval fantasy hero, broad, sturdy guardian, wielding heavy plate armor and a large shield. Element 숲/바람: color palette of emerald green, teal, jade; leaves, vines, wind gusts; spiraling leaves and green wind currents. Expression/mood: reassuring, steadfast. Rarity R (레어): modest elemental glow, decorated gear. Pose: grounded protective stance, shield forward. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 아엘 — 빛의 예언자 · R · 빛 · 지원형
`assets/char/fantasy/ael.png` · 성격: 신비로운

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "아엘" (빛의 예언자) — medieval fantasy hero, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 빛: color palette of radiant gold, ivory white, soft amber; halo, feathers, holy runes; radiant light beams and drifting feathers. Expression/mood: mysterious, otherworldly. Rarity R (레어): modest elemental glow, decorated gear. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 아라 — 폭풍검 · R · 어둠 · 공격형
`assets/char/fantasy/ara.png` · 성격: 거친

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "아라" (폭풍검) — medieval fantasy hero, agile, lithe duelist, wielding light armor and a bladed weapon. Element 어둠: color palette of violet, magenta, obsidian black; shadow tendrils, arcane sigils, void; curling shadow smoke and glowing purple runes. Expression/mood: wild, rough intensity. Rarity R (레어): modest elemental glow, decorated gear. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 미르 — 견습 검사 · N · 숲/바람 · 공격형
`assets/char/fantasy/mir.png` · 성격: 풋풋한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "미르" (견습 검사) — medieval fantasy hero, agile, lithe duelist, wielding light armor and a bladed weapon. Element 숲/바람: color palette of emerald green, teal, jade; leaves, vines, wind gusts; spiraling leaves and green wind currents. Expression/mood: youthful, earnest. Rarity N (노멀): minimal effects, plain practical gear, understated. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 피라 — 홍염의 방벽 · SR · 불 · 방어형
`assets/char/fantasy/pyra.png` · 성격: 굳건한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "피라" (홍염의 방벽) — medieval fantasy hero, broad, sturdy guardian, wielding heavy plate armor and a large shield. Element 불: color palette of warm crimson, orange, molten gold; embers, flame aura, heat shimmer, ash particles; licking flames and floating sparks. Expression/mood: unshakeable determination. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: grounded protective stance, shield forward. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 프로스트 — 빙하의 자객 · SR · 물/얼음 · 공격형
`assets/char/fantasy/frost.png` · 성격: 냉정한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "프로스트" (빙하의 자객) — medieval fantasy hero, agile, lithe duelist, wielding light armor and a bladed weapon. Element 물/얼음: color palette of cyan, deep blue, frost white; ice crystals, flowing water, frost mist; swirling water ribbons and glinting ice shards. Expression/mood: cold, calculating calm. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 마리나 — 조수의 치유사 · SR · 물/얼음 · 지원형
`assets/char/fantasy/marina.png` · 성격: 온화한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "마리나" (조수의 치유사) — medieval fantasy hero, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 물/얼음: color palette of cyan, deep blue, frost white; ice crystals, flowing water, frost mist; swirling water ribbons and glinting ice shards. Expression/mood: warm, kind smile. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 시그네 — 전열의 고수병 · R · 불 · 지원형
`assets/char/fantasy/signe.png` · 성격: 용맹한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "시그네" (전열의 고수병) — medieval fantasy hero, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 불: color palette of warm crimson, orange, molten gold; embers, flame aura, heat shimmer, ash particles; licking flames and floating sparks. Expression/mood: brave, rallying spirit. Rarity R (레어): modest elemental glow, decorated gear. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 아우렐 — 여명의 성검사 · UR · 빛 · 공격형
`assets/char/fantasy/aurel.png` · 성격: 고결한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "아우렐" (여명의 성검사) — medieval fantasy hero, agile, lithe duelist, wielding light armor and a bladed weapon. Element 빛: color palette of radiant gold, ivory white, soft amber; halo, feathers, holy runes; radiant light beams and drifting feathers. Expression/mood: noble, righteous grace. Rarity UR (신화): maximal cinematic FX, radiant divine aura, intricate legendary ornamentation, godlike presence, volumetric light. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 닉스 — 심연의 대예언자 · UR · 어둠 · 지원형
`assets/char/fantasy/nyx.png` · 성격: 초연한

```
high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume. Subject: "닉스" (심연의 대예언자) — medieval fantasy hero, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 어둠: color palette of violet, magenta, obsidian black; shadow tendrils, arcane sigils, void; curling shadow smoke and glowing purple runes. Expression/mood: detached, transcendent calm. Rarity UR (신화): maximal cinematic FX, radiant divine aura, intricate legendary ornamentation, godlike presence, volumetric light. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

### SF · 오비탈 프로토콜

#### 유닛-07 — 화염 프레임 · SSR · 불 · 공격형
`assets/char/scifi/kael.png` · 성격: 공격적인

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "유닛-07" (화염 프레임) — futuristic combat unit in powered exo-frame, agile, lithe duelist, wielding light armor and a bladed weapon. Element 불: color palette of warm crimson, orange, molten gold; embers, flame aura, heat shimmer, ash particles; licking flames and floating sparks. Expression/mood: aggressive combat focus. Rarity SSR (전설): dramatic elemental FX, glowing runes, rich ornamentation, energy particles. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 노바 — 지원 코어 · SSR · 빛 · 지원형
`assets/char/scifi/luna.png` · 성격: 침착한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "노바" (지원 코어) — futuristic combat unit in powered exo-frame, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 빛: color palette of radiant gold, ivory white, soft amber; halo, feathers, holy runes; radiant light beams and drifting feathers. Expression/mood: composed, analytical. Rarity SSR (전설): dramatic elemental FX, glowing runes, rich ornamentation, energy particles. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 크라이오 — 냉각 가디언 · SR · 물/얼음 · 방어형
`assets/char/scifi/gwen.png` · 성격: 과묵한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "크라이오" (냉각 가디언) — futuristic combat unit in powered exo-frame, broad, sturdy guardian, wielding heavy plate armor and a large shield. Element 물/얼음: color palette of cyan, deep blue, frost white; ice crystals, flowing water, frost mist; swirling water ribbons and glinting ice shards. Expression/mood: stoic, silent resolve. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: grounded protective stance, shield forward. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 제트 — 고속 유닛 · SR · 숲/바람 · 공격형
`assets/char/scifi/ciel.png` · 성격: 경쾌한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "제트" (고속 유닛) — futuristic combat unit in powered exo-frame, agile, lithe duelist, wielding light armor and a bladed weapon. Element 숲/바람: color palette of emerald green, teal, jade; leaves, vines, wind gusts; spiraling leaves and green wind currents. Expression/mood: lighthearted, quick. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 불워크 — 중장 프레임 · R · 숲/바람 · 방어형
`assets/char/scifi/bran.png` · 성격: 견고한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "불워크" (중장 프레임) — futuristic combat unit in powered exo-frame, broad, sturdy guardian, wielding heavy plate armor and a large shield. Element 숲/바람: color palette of emerald green, teal, jade; leaves, vines, wind gusts; spiraling leaves and green wind currents. Expression/mood: solid, immovable. Rarity R (레어): modest elemental glow, decorated gear. Pose: grounded protective stance, shield forward. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 오라클 — 예측 AI · R · 빛 · 지원형
`assets/char/scifi/ael.png` · 성격: 분석적인

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "오라클" (예측 AI) — futuristic combat unit in powered exo-frame, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 빛: color palette of radiant gold, ivory white, soft amber; halo, feathers, holy runes; radiant light beams and drifting feathers. Expression/mood: precise, analytical gaze. Rarity R (레어): modest elemental glow, decorated gear. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 스톰 — 방전 유닛 · R · 어둠 · 공격형
`assets/char/scifi/ara.png` · 성격: 난폭한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "스톰" (방전 유닛) — futuristic combat unit in powered exo-frame, agile, lithe duelist, wielding light armor and a bladed weapon. Element 어둠: color palette of violet, magenta, obsidian black; shadow tendrils, arcane sigils, void; curling shadow smoke and glowing purple runes. Expression/mood: violent, unrestrained. Rarity R (레어): modest elemental glow, decorated gear. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 루키 — 시제기 · N · 숲/바람 · 공격형
`assets/char/scifi/mir.png` · 성격: 미숙한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "루키" (시제기) — futuristic combat unit in powered exo-frame, agile, lithe duelist, wielding light armor and a bladed weapon. Element 숲/바람: color palette of emerald green, teal, jade; leaves, vines, wind gusts; spiraling leaves and green wind currents. Expression/mood: inexperienced but eager. Rarity N (노멀): minimal effects, plain practical gear, understated. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 파이로 — 화염 방벽 프레임 · SR · 불 · 방어형
`assets/char/scifi/pyra.png` · 성격: 견고한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "파이로" (화염 방벽 프레임) — futuristic combat unit in powered exo-frame, broad, sturdy guardian, wielding heavy plate armor and a large shield. Element 불: color palette of warm crimson, orange, molten gold; embers, flame aura, heat shimmer, ash particles; licking flames and floating sparks. Expression/mood: solid, immovable. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: grounded protective stance, shield forward. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 글레이셔 — 빙결 어쌔신 · SR · 물/얼음 · 공격형
`assets/char/scifi/frost.png` · 성격: 냉철한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "글레이셔" (빙결 어쌔신) — futuristic combat unit in powered exo-frame, agile, lithe duelist, wielding light armor and a bladed weapon. Element 물/얼음: color palette of cyan, deep blue, frost white; ice crystals, flowing water, frost mist; swirling water ribbons and glinting ice shards. Expression/mood: icy precision. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 티데 — 수복 드로이드 · SR · 물/얼음 · 지원형
`assets/char/scifi/marina.png` · 성격: 차분한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "티데" (수복 드로이드) — futuristic combat unit in powered exo-frame, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 물/얼음: color palette of cyan, deep blue, frost white; ice crystals, flowing water, frost mist; swirling water ribbons and glinting ice shards. Expression/mood: serene, gentle composure. Rarity SR (에픽): strong elemental aura, ornate detailed gear, particle accents. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 클래리온 — 전술 지휘 유닛 · R · 불 · 지원형
`assets/char/scifi/signe.png` · 성격: 결연한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "클래리온" (전술 지휘 유닛) — futuristic combat unit in powered exo-frame, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 불: color palette of warm crimson, orange, molten gold; embers, flame aura, heat shimmer, ash particles; licking flames and floating sparks. Expression/mood: resolute, commanding. Rarity R (레어): modest elemental glow, decorated gear. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 오리온 — 여명 프로토타입 · UR · 빛 · 공격형
`assets/char/scifi/aurel.png` · 성격: 숭고한

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "오리온" (여명 프로토타입) — futuristic combat unit in powered exo-frame, agile, lithe duelist, wielding light armor and a bladed weapon. Element 빛: color palette of radiant gold, ivory white, soft amber; halo, feathers, holy runes; radiant light beams and drifting feathers. Expression/mood: sublime, exalted. Rarity UR (신화): maximal cinematic FX, radiant divine aura, intricate legendary ornamentation, godlike presence, volumetric light. Pose: dynamic aggressive stance, weapon mid-motion. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

#### 아뷔스 — 심연 예측 코어 · UR · 어둠 · 지원형
`assets/char/scifi/nyx.png` · 성격: 초월적인

```
sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech. Subject: "아뷔스" (심연 예측 코어) — futuristic combat unit in powered exo-frame, graceful, slender mage/medic, wielding flowing robes and a staff or focus. Element 어둠: color palette of violet, magenta, obsidian black; shadow tendrils, arcane sigils, void; curling shadow smoke and glowing purple runes. Expression/mood: transcendent, beyond mortal. Rarity UR (신화): maximal cinematic FX, radiant divine aura, intricate legendary ornamentation, godlike presence, volumetric light. Pose: elegant gesture, calm and poised. Framing: bust to upper-body, character centered, face in upper-middle, transparent background. Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.
```

---

## 7. 워크플로

1. 위 프롬프트로 이미지 생성/외주.
2. **투명 배경 처리** + 512×512 정사각 크롭(얼굴 상단 1/3).
3. `assets/char/<concept>/<id>.png` 로 저장(기존 플레이스홀더 덮어쓰기).
4. 이미 `app/charImages.js`에 28종 전량 등록돼 있으므로 **추가 코드 불필요** — 저장 즉시 반영.
5. 웹 미리보기: `npm run build:play` → docs/play.html.
6. 배포: OTA(`eas update`)로 재빌드 없이 아트 교체 가능 (docs/ANDROID_BUILD.md).

> 플레이스홀더는 `npm run gen:portraits`로 언제든 재생성됩니다(실아트 준비 전 공백 방지).
