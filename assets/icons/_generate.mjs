// GUI 아이콘 SVG 세트 생성기 — 투톤 회색 + 골드(보상). 리포 assets/icons/ 로 emit.
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

// class="fill"=어두운 회색 채움, class="line"=밝은 회색 라인. reward=골드.
// 색은 CSS 변수(폴백값 내장) → 단독 렌더 OK, 토큰 교체 OK.
const P = {
  battle:   '<path class="line" d="M4 4l7 7M4 8V4h4M14 10l6-6M20 8V4h-4M9 15l-5 5M4 16v4h4M15 9l5 5M20 16v4h-4"/>',
  hero:     '<path class="fill" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path class="line" d="M9 11l2 2 4-4"/>',
  summon:   '<path class="fill" d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z"/>',
  expedition:'<path class="line" d="M6 21V4M6 5h11l-2 3 2 3H6"/>',
  content:  '<rect class="fill" x="4" y="4" width="7" height="7" rx="1.5"/><rect class="line" x="13" y="4" width="7" height="7" rx="1.5"/><rect class="line" x="4" y="13" width="7" height="7" rx="1.5"/><rect class="fill" x="13" y="13" width="7" height="7" rx="1.5"/>',
  shop:     '<path class="fill" d="M6 8h12l-1 12H7L6 8z"/><path class="line" d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  gear:     '<circle class="fill" cx="12" cy="12" r="3.4"/><path class="line" d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2"/>',
  mail:     '<rect class="fill" x="3" y="6" width="18" height="12" rx="2"/><path class="line" d="M3.5 7l8.5 6 8.5-6"/>',
  auto:     '<path class="line" d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/>',
  fast:     '<path class="fill" d="M4 6l7 6-7 6V6zM13 6l7 6-7 6V6z"/>',
  quest:    '<path class="fill" d="M6 3h9l3 3v15H6z"/><path class="line" d="M9 8h6M9 12h6M9 16h4"/>',
  dungeon:  '<path class="line" d="M4 21V8l8-5 8 5v13M9 21v-6a3 3 0 0 1 6 0v6"/>',
  arena:    '<path class="fill" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path class="line" d="M9 8l6 8M15 8l-6 8"/>',
  gift:     '<rect class="reward-fill" x="4" y="10" width="16" height="10" rx="1.5"/><path class="reward-line" d="M4 10h16M12 10v10M12 10c-2-4-6-4-6-1s4 1 6 1zM12 10c2-4 6-4 6-1s-4 1-6 1z"/>',
};

// key → 한글 라벨(파일 헤더 주석용)
const LABELS = {
  battle:'전투', hero:'영웅', summon:'소환', expedition:'원정', content:'콘텐츠', shop:'상점',
  gear:'설정', mail:'우편', auto:'자동', fast:'배속', quest:'퀘스트', dungeon:'던전', arena:'아레나', gift:'수령(보상)',
};

const STYLE = `<style>
    .fill{ fill:var(--icon-fill,#7b818e); }
    .line{ fill:none; stroke:var(--icon-line,#c3c8d2); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .reward-fill{ fill:var(--icon-gold,#e8b84b); }
    .reward-line{ fill:none; stroke:var(--icon-gold-soft,#f6d488); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  </style>`;

for (const [key, body] of Object.entries(P)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" role="img" aria-label="${LABELS[key]}">
  <!-- ${LABELS[key]} 아이콘 · 투톤 회색+골드 토킷 세트 -->
  ${STYLE}
  ${body}
</svg>
`;
  writeFileSync(`${OUT}/${key}.svg`, svg, 'utf8');
}
console.log(`generated ${Object.keys(P).length} icons → ${OUT}`);
