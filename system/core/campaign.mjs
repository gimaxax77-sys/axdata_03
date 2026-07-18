import { getStage } from './progression.mjs';
import { resolve } from './resolution.mjs';
import { getPartyUnits } from './gameState.mjs';
import { accountMods } from './balance.mjs';
import { earn } from './economy.mjs';

// ─────────────────────────────────────────────────────────────
// 스토리 캠페인 — 장르/컨셉 무관 진행 로직. 서사(텍스트)는 Concept가 제공.
//   · 챕터마다 보스 전투(파티 vs 강화된 적). 승리 시 다음 챕터 해금 + 보상.
//   · 같은 resolve() 엔진 사용 → 방치/RPG와 완전히 동일한 판정.
//   · 씨앗의 "서사 발현"과 맥을 같이 하는 월드 스토리 축.
// 진행도: state.campaign.cleared (클리어한 챕터 수).
// ─────────────────────────────────────────────────────────────

export const CAMPAIGN_CHAPTER_COUNT = 12;

// 챕터 i(0-based)의 보스 난이도 — 진행 스테이지 기반 + 보스 강화.
function bossStageFor(i) { return 6 + i * 7; } // 6,13,20,…55
export function bossChallenge(i) {
  const c = getStage(bossStageFor(i)).challenge;
  return {
    hp: Math.round(c.hp * 1.7), atk: Math.round(c.atk * 1.25),
    def: Math.round(c.def * 1.2), element: c.element,
  };
}
export function chapterReward(i) {
  return { gem: 30 + i * 10, summon: 20 + i * 5 };
}

// Concept가 넘긴 서사 배열과 결합해 챕터 목록을 만든다.
export function campaignChapters(state, conceptCampaign = []) {
  const cleared = (state.campaign && state.campaign.cleared) || 0;
  const out = [];
  for (let i = 0; i < CAMPAIGN_CHAPTER_COUNT; i++) {
    const lore = conceptCampaign[i] || { title: `챕터 ${i + 1}`, story: '' };
    out.push({
      index: i, title: lore.title, story: lore.story,
      unlocked: i <= cleared, cleared: i < cleared, isNext: i === cleared && i < CAMPAIGN_CHAPTER_COUNT,
      boss: bossChallenge(i), bossStage: bossStageFor(i), reward: chapterReward(i),
    });
  }
  return out;
}

// 스토리 정주행 도감 — 클리어한 챕터의 서사만 모아 다시 읽는 로그.
//   플레이 중엔 성장을 위해 스킵하지만, 나중에 여유가 생겼을 때 모아본다.
//   반환: { readable:[{index,title,story}], lockedCount, total }
export function storyLog(state, conceptCampaign = []) {
  const chapters = campaignChapters(state, conceptCampaign);
  const readable = chapters
    .filter((c) => c.cleared && c.story) // 클리어한 챕터만 정주행 가능
    .map((c) => ({ index: c.index, title: c.title, story: c.story }));
  return { readable, lockedCount: chapters.length - readable.length, total: chapters.length };
}

// 챕터 도전. 승리 & 최초 클리어면 보상 + 진행.
export function fightChapter(state, i) {
  const cleared = (state.campaign && state.campaign.cleared) || 0;
  if (i > cleared) return { ok: false, reason: '이전 챕터를 먼저 클리어하세요' };
  const party = getPartyUnits(state);
  if (!party.length) return { ok: false, reason: '파티 없음' };
  const res = resolve(party, bossChallenge(i), accountMods(state), state.formation);
  if (!res.win) return { ok: true, win: false, margin: res.margin };
  let reward = null;
  if (i === cleared) {
    reward = chapterReward(i);
    earn(state.wallet, reward);
    state.campaign.cleared = cleared + 1;
  }
  return { ok: true, win: true, reward, cleared: state.campaign.cleared, allClear: state.campaign.cleared >= CAMPAIGN_CHAPTER_COUNT };
}
