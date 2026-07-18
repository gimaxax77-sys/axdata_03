// 아트 바이블 생성기 — 로스터 메타데이터 + 스타일 빌딩블록으로
// 캐릭터별 일러스트 생성 프롬프트(영문)와 한글 요약을 조합해 docs/ART_BIBLE.md 출력.
//   실행: node scripts/gen-artbible.mjs
import { CONCEPTS } from '../system/concepts/index.mjs';
import fs from 'node:fs';

// 속성: 팔레트 · 모티프 · FX
const ELEMENT = {
  FIRE:  { ko: '불', palette: 'warm crimson, orange, molten gold', motif: 'embers, flame aura, heat shimmer, ash particles', fx: 'licking flames and floating sparks' },
  WATER: { ko: '물/얼음', palette: 'cyan, deep blue, frost white', motif: 'ice crystals, flowing water, frost mist', fx: 'swirling water ribbons and glinting ice shards' },
  WOOD:  { ko: '숲/바람', palette: 'emerald green, teal, jade', motif: 'leaves, vines, wind gusts', fx: 'spiraling leaves and green wind currents' },
  LIGHT: { ko: '빛', palette: 'radiant gold, ivory white, soft amber', motif: 'halo, feathers, holy runes', fx: 'radiant light beams and drifting feathers' },
  DARK:  { ko: '어둠', palette: 'violet, magenta, obsidian black', motif: 'shadow tendrils, arcane sigils, void', fx: 'curling shadow smoke and glowing purple runes' },
};

// 아키타입: 실루엣 · 장비 · 포즈
const ARCH = {
  STRIKER:  { ko: '공격형', build: 'agile, lithe', gear: 'light armor and a bladed weapon', pose: 'dynamic aggressive stance, weapon mid-motion' },
  VANGUARD: { ko: '방어형', build: 'broad, sturdy', gear: 'heavy plate armor and a large shield', pose: 'grounded protective stance, shield forward' },
  SUPPORT:  { ko: '지원형', build: 'graceful, slender', gear: 'flowing robes and a staff or focus', pose: 'elegant gesture, calm and poised' },
};

// 등급: FX 강도 위계 (아트에서 등급이 읽혀야 함)
const RARITY = {
  N:   { ko: '노멀', fx: 'minimal effects, plain practical gear, understated' },
  R:   { ko: '레어', fx: 'modest elemental glow, decorated gear' },
  SR:  { ko: '에픽', fx: 'strong elemental aura, ornate detailed gear, particle accents' },
  SSR: { ko: '전설', fx: 'dramatic elemental FX, glowing runes, rich ornamentation, energy particles' },
  UR:  { ko: '신화', fx: 'maximal cinematic FX, radiant divine aura, intricate legendary ornamentation, godlike presence, volumetric light' },
};

// 성격 → 표정/분위기 (한글 성격을 영문 뉘앙스로)
const MOOD = {
  '불같은': 'fierce, burning confidence', '차분한': 'serene, gentle composure', '과묵한': 'stoic, silent resolve',
  '장난기 많은': 'playful smirk, mischievous', '든든한': 'reassuring, steadfast', '신비로운': 'mysterious, otherworldly',
  '거친': 'wild, rough intensity', '풋풋한': 'youthful, earnest', '굳건한': 'unshakeable determination',
  '냉정한': 'cold, calculating calm', '온화한': 'warm, kind smile', '용맹한': 'brave, rallying spirit',
  '고결한': 'noble, righteous grace', '초연한': 'detached, transcendent calm',
  '공격적인': 'aggressive combat focus', '침착한': 'composed, analytical', '경쾌한': 'lighthearted, quick',
  '견고한': 'solid, immovable', '분석적인': 'precise, analytical gaze', '난폭한': 'violent, unrestrained',
  '미숙한': 'inexperienced but eager', '냉철한': 'icy precision', '결연한': 'resolute, commanding',
  '숭고한': 'sublime, exalted', '초월적인': 'transcendent, beyond mortal',
};

// 컨셉별 스타일 베이스
const CONCEPT_STYLE = {
  fantasy: {
    label: '판타지 · 엘드리아 연대기',
    base: 'high-fantasy anime gacha character art, semi-realistic painterly illustration, ornate fantasy costume',
    world: 'medieval fantasy hero',
  },
  scifi: {
    label: 'SF · 오비탈 프로토콜',
    base: 'sleek sci-fi anime gacha character art, semi-realistic painterly illustration, cyber armor and glowing tech',
    world: 'futuristic combat unit in powered exo-frame',
  },
};

const NEGATIVE = 'lowres, blurry, extra limbs, bad anatomy, watermark, text, signature, jpeg artifacts, cropped head, out of frame, multiple characters';

function prompt(concept, cid, c) {
  const el = ELEMENT[c.element], ar = ARCH[c.archetype], ra = RARITY[c.rarity];
  const mood = MOOD[c.personality] || 'determined';
  const cs = CONCEPT_STYLE[cid];
  const subj = `${cs.world}, ${ar.build} ${ar.ko === '지원형' ? 'mage/medic' : ar.ko === '방어형' ? 'guardian' : 'duelist'}`;
  return [
    `${cs.base}.`,
    `Subject: "${c.name}" (${c.title}) — ${subj}, wielding ${ar.gear}.`,
    `Element ${el.ko}: color palette of ${el.palette}; ${el.motif}; ${el.fx}.`,
    `Expression/mood: ${mood}.`,
    `Rarity ${c.rarity} (${ra.ko}): ${ra.fx}.`,
    `Pose: ${ar.pose}.`,
    `Framing: bust to upper-body, character centered, face in upper-middle, transparent background.`,
    `Rendering: dramatic rim lighting matching the element, clean cel-paint shading, crisp edges, mobile-game key-art quality.`,
  ].join(' ');
}

let md = `# 아트 바이블 — 캐릭터 일러스트 제작 가이드

이 문서는 28종 캐릭터(판타지·SF 각 14종)의 **실제 일러스트 제작용 스펙과 생성 프롬프트**입니다.
AI 생성(Midjourney·SDXL·Nano Banana 등)·외주 어느 쪽이든 그대로 전달하면 됩니다.
완성물을 규격대로 저장하면(\`assets/char/<concept>/<id>.png\`) 앱 전역에 자동 반영됩니다.

---

## 1. 공통 규격 (반드시 준수)

- **해상도/포맷**: 512×512 이상, **투명 배경 PNG** (앱 프레임에 \`cover\`로 채워짐).
- **구도**: **얼굴~상반신(bust) 중앙 배치**, 얼굴은 상단 1/3에. 프레임이 정사각이라 머리 잘림 주의.
- **일관성**: 14종이 **하나의 게임처럼** 보이도록 동일 렌더 스타일·라인 두께·채색 기법 유지.
- **등급이 읽히게**: 노멀=담백 → 신화=화려. 아래 등급별 FX 위계를 따름.
- **속성이 읽히게**: 속성별 팔레트·모티프를 주조색으로.
- **라이선스**: AI/외주/스토어 어느 경로든 **상업 배포 라이선스** 확인 필수.

## 2. 속성 팔레트 · 모티프

| 속성 | 팔레트 | 모티프 | 이펙트 |
|---|---|---|---|
${Object.entries(ELEMENT).map(([k, v]) => `| ${k} (${v.ko}) | ${v.palette} | ${v.motif} | ${v.fx} |`).join('\n')}

## 3. 아키타입 실루엣

| 역할 | 체형 | 장비 | 포즈 |
|---|---|---|---|
${Object.entries(ARCH).map(([k, v]) => `| ${k} (${v.ko}) | ${v.build} | ${v.gear} | ${v.pose} |`).join('\n')}

## 4. 등급별 FX 위계

| 등급 | 연출 |
|---|---|
${Object.entries(RARITY).map(([k, v]) => `| ${k} (${v.ko}) | ${v.fx} |`).join('\n')}

## 5. 공통 네거티브 프롬프트

\`\`\`
${NEGATIVE}
\`\`\`

---

## 6. 캐릭터별 프롬프트
`;

for (const cid of ['fantasy', 'scifi']) {
  const concept = CONCEPTS[cid];
  const cs = CONCEPT_STYLE[cid];
  md += `\n### ${cs.label}\n`;
  for (const c of concept.roster) {
    md += `\n#### ${c.name} — ${c.title} · ${c.rarity} · ${ELEMENT[c.element].ko} · ${ARCH[c.archetype].ko}\n`;
    md += `\`assets/char/${cid}/${c.id}.png\` · 성격: ${c.personality}\n\n`;
    md += '```\n' + prompt(null, cid, c) + '\n```\n';
  }
}

md += `\n---

## 7. 워크플로

1. 위 프롬프트로 이미지 생성/외주.
2. **투명 배경 처리** + 512×512 정사각 크롭(얼굴 상단 1/3).
3. \`assets/char/<concept>/<id>.png\` 로 저장(기존 플레이스홀더 덮어쓰기).
4. 이미 \`app/charImages.js\`에 28종 전량 등록돼 있으므로 **추가 코드 불필요** — 저장 즉시 반영.
5. 웹 미리보기: \`npm run build:play\` → docs/play.html.
6. 배포: OTA(\`eas update\`)로 재빌드 없이 아트 교체 가능 (docs/ANDROID_BUILD.md).

> 플레이스홀더는 \`npm run gen:portraits\`로 언제든 재생성됩니다(실아트 준비 전 공백 방지).
`;

fs.writeFileSync('docs/ART_BIBLE.md', md);
console.log('생성: docs/ART_BIBLE.md (' + md.length + ' bytes)');
