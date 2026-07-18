import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { T, rarityMeta } from '../theme';
import { Card, Btn, fmt, MultiToggle, multLabel, repeat } from '../components';
import { CodeTag } from '../uicode';
import { fx } from '../feedback';
import { RELICS, relicUpgradeCost, upgradeRelic, relicCap } from '../../system/core/relics.mjs';
import { EMBLEMS, emblemUpgradeCost, upgradeEmblem, emblemCap, emblemComplete, EMBLEM_COMPLETE_BONUS } from '../../system/core/emblems.mjs';
import { GUARDIANS, equipGuardian, unequipGuardian, guardianEffectLabel, MAX_ACTIVE_GUARDIANS } from '../../system/core/guardians.mjs';
import { PETS, petSummon, equipPet, unequipPet, petEffectLabel, MAX_ACTIVE_PETS, PET_PULL_COST,
  rerollPetOpt, petFuse, petFuseAvail, petOptLabel, PET_FUSE_COST,
  petShardSummon, SHARD_SUMMON_COST, autoFusePets } from '../../system/core/pets.mjs';
import { MATERIAL_META, SHARD_META, materialCount } from '../../system/core/materials.mjs';
import { isUnlocked, unlockStage } from '../../system/core/unlocks.mjs';
import { isOn } from '../../system/core/features.mjs';

// 등급 인라인 배지.
function rarityText(r) {
  return { backgroundColor: rarityMeta(r).color, color: '#160f28', fontWeight: '900', fontSize: 10, borderRadius: 4, overflow: 'hidden' };
}

// 아이콘 타일 — 이모지 + 레벨 + 등급(+ 장착중 ✅). 탭하면 상세 팝업.
// 등급 모듈 off면 등급 테두리·라벨 숨김.
function Tile({ emoji, rarity, level, active, onPress, label }) {
  const showR = rarity && isOn('rarity');
  return (
    <TouchableOpacity onPress={onPress} style={[c.tile, showR && { borderColor: rarityMeta(rarity).color }]} activeOpacity={0.8}
      accessibilityRole="button" accessibilityLabel={`${label || ''}${level != null ? ` 레벨 ${level}` : ''}${active ? ' 장착중' : ''}`}>
      {active ? <Text style={c.tileActive}>✅</Text> : null}
      <Text style={c.tileEmoji}>{emoji}</Text>
      {level != null ? <Text style={c.tileLv}>Lv.{level}</Text> : null}
      {showR ? <Text style={rarityText(rarity)}> {rarity} </Text> : null}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// GrowthPanel — 계정 성장(펫·유물·엠블럼·정령). 아이콘 타일 + 상세 팝업(변경 전후 비교).
// ─────────────────────────────────────────────────────────────
export default function GrowthPanel({ state, bump, concept }) {
  const [mult, setMult] = useState(1);
  const [msg, setMsg] = useState(null);
  const [detail, setDetail] = useState(null); // { type:'relic'|'emblem'|'pet'|'guardian', id }
  const act = (fn) => { fn(); bump(); };
  const actN = (fn) => { repeat(fn, mult); bump(); };
  const doAutoFuse = (opts) => {
    const r = autoFusePets(state, Math.random, opts);
    if (r.ok) { fx('success'); setMsg(`🔁 자동 합성 ${r.fused}회${opts && opts.stopAt ? ` (${opts.stopAt} 보호)` : ''}`); } else { fx('error'); }
    bump();
  };
  const R = concept.resources;

  // 상세 팝업 정보 — 타입별 정규화 + 변경 전후 비교값.
  const buildDetail = () => {
    if (!detail) return null;
    if (detail.type === 'relic' || detail.type === 'emblem') {
      const isRelic = detail.type === 'relic';
      const def = (isRelic ? RELICS : EMBLEMS)[detail.id];
      const lv = ((isRelic ? state.relics : state.emblems) || {})[detail.id] || 0;
      const cap = isRelic ? relicCap(detail.id) : emblemCap(detail.id);
      const maxed = lv >= cap;
      const cost = isRelic ? relicUpgradeCost(lv) : emblemUpgradeCost(lv);
      const eff = def.kind === 'power' ? '전투력' : def.kind === 'currency' ? `${R.currency.name} 수입` : `${R.growth.name} 수입`;
      const cur = def.per * lv, next = def.per * (lv + 1);
      const res = isRelic ? R.currency : R.gem;
      const costVal = isRelic ? cost.currency : cost.gem;
      const walletKey = isRelic ? 'currency' : 'gem';
      const canUp = !maxed && (state.wallet[walletKey] || 0) >= costVal;
      return {
        emoji: def.emoji, name: def.label, rarity: def.rarity, sub: `${eff} · Lv.${lv}/${cap}`,
        compare: {
          curLabel: `현재 Lv.${lv}`, cur: `+${Math.round(cur * 100)}%`,
          nextLabel: maxed ? 'MAX' : `Lv.${lv + 1}`, next: maxed ? '—' : `+${Math.round(next * 100)}%`,
          delta: maxed ? '최대치 도달' : `▲ +${Math.round((next - cur) * 100)}%`,
        },
        actions: (<>
          {!maxed && <View style={c.mToggle}><MultiToggle value={mult} onChange={setMult} /></View>}
          <Btn kind="gold" disabled={!canUp}
            label={maxed ? '최대 강화 완료' : `강화 ${multLabel(mult)} ${res.emoji}${fmt(costVal)}`}
            onPress={() => actN(() => (isRelic ? upgradeRelic : upgradeEmblem)(state, detail.id))} />
        </>),
      };
    }
    // 펫 / 정령 (장착형)
    const isPet = detail.type === 'pet';
    const def = (isPet ? PETS : GUARDIANS)[detail.id];
    if (!def) return null;
    const lv = ((isPet ? state.pets.owned : state.guardians.owned) || {})[detail.id] || 0;
    const activeList = isPet ? state.pets.active : state.guardians.active;
    const equipped = activeList.includes(detail.id);
    const full = activeList.length >= (isPet ? MAX_ACTIVE_PETS : MAX_ACTIVE_GUARDIANS);
    const effLabel = isPet ? petEffectLabel(def.type, concept) : guardianEffectLabel(def.kind, concept);
    const effPct = Math.round(def.per * lv * 100);
    const opt = isPet && state.pets.opts && state.pets.opts[detail.id];
    return {
      emoji: def.emoji, name: def.label, rarity: def.rarity,
      sub: `${effLabel} +${effPct}% · Lv.${lv}${opt ? ` · 옵션 ${petOptLabel(opt, concept)}` : ''}`,
      compare: {
        curLabel: equipped ? '장착중' : '미장착', cur: equipped ? `+${effPct}%` : '—',
        nextLabel: equipped ? '해제 시' : '장착 시', next: equipped ? '—' : `+${effPct}%`,
        delta: equipped ? `▼ 해제 -${effPct}%` : `▲ 장착 +${effPct}%`,
      },
      actions: (<>
        <Btn kind={equipped ? 'ghost' : 'primary'} disabled={!equipped && full}
          label={equipped ? '해제' : full ? '슬롯 참 (해제 후 장착)' : '장착'}
          onPress={() => act(() => (equipped ? (isPet ? unequipPet : unequipGuardian) : (isPet ? equipPet : equipGuardian))(state, detail.id))} />
        {isPet ? (<>
          <View style={{ height: 8 }} />
          <Btn kind="ghost" label={`옵션 재련 ${R.gem.emoji}15`} onPress={() => act(() => rerollPetOpt(state, detail.id))} />
        </>) : null}
      </>),
    };
  };
  const info = buildDetail();

  const petsUnlocked = isUnlocked(state, 'pets');
  const emblemUnlocked = isUnlocked(state, 'emblem');
  const guardUnlocked = isUnlocked(state, 'guardian');

  return (
    <View>
      {/* 보유 재료 요약 */}
      <View style={c.matBar}>
        <CodeTag id="h1" corner="tl" />
        <Text style={c.matChip}>{MATERIAL_META.elemEssence.emoji} {MATERIAL_META.elemEssence.label} {fmt(materialCount(state, 'elemEssence'))}</Text>
        {['R', 'SR', 'SSR', 'UR'].map((g) => (
          <Text key={g} style={c.matChip}>{SHARD_META.emoji}{g} {fmt(materialCount(state, 'petShard', g))}</Text>
        ))}
      </View>
      {msg ? <Text style={c.msg}>{msg}</Text> : null}

      {/* 펫 */}
      <Card style={{ marginTop: 4 }}>
        <CodeTag id="h2" corner="tl" />
        <View style={c.petHead}>
          <Text style={c.sec}>🐾 펫 <Text style={c.dim}>(장착 {state.pets.active.length}/{MAX_ACTIVE_PETS})</Text></Text>
          {petsUnlocked && <MultiToggle value={mult} onChange={setMult} />}
        </View>
        {!petsUnlocked && <Text style={c.sub}>🔒 스테이지 {unlockStage('pets')} 도달 시 해금</Text>}
        {petsUnlocked && (
          <Btn small kind="gold" label={`펫 소환 ${multLabel(mult)} ${R.gem.emoji}${mult === 'Max' ? '' : fmt(PET_PULL_COST.gem * mult)}`}
            disabled={(state.wallet.gem || 0) < PET_PULL_COST.gem} onPress={() => actN(() => petSummon(state))} />
        )}
        {petsUnlocked && (
          <View style={c.fuseRow}>
            {['R', 'SR', 'SSR', 'UR'].map((g) => {
              const have = materialCount(state, 'petShard', g);
              const can = have >= SHARD_SUMMON_COST;
              return (
                <Btn key={g} small kind={can ? 'gold' : 'ghost'} disabled={!can}
                  label={`${SHARD_META.emoji}${g} ${Math.min(have, SHARD_SUMMON_COST)}/${SHARD_SUMMON_COST}`}
                  onPress={() => act(() => petShardSummon(state, g))} />
              );
            })}
          </View>
        )}
        {petsUnlocked && Object.keys(state.pets.owned).length > 0 && (
          <View style={c.fuseRow}>
            {['R', 'SR', 'SSR'].map((rar) => {
              const avail = petFuseAvail(state, rar);
              const can = avail >= PET_FUSE_COST;
              return (
                <Btn key={rar} small kind={can ? 'gold' : 'ghost'} disabled={!can}
                  label={`${rar} 합성 ${Math.min(avail, PET_FUSE_COST)}/${PET_FUSE_COST}`}
                  onPress={() => act(() => petFuse(state, rar))} />
              );
            })}
            <Btn small kind="primary"
              disabled={!['R', 'SR', 'SSR'].some((rar) => petFuseAvail(state, rar) >= PET_FUSE_COST)}
              label="🔁 자동" onPress={() => doAutoFuse()} />
            <Btn small kind="ghost"
              disabled={!['R', 'SR'].some((rar) => petFuseAvail(state, rar) >= PET_FUSE_COST)}
              label="🛡️ SSR보호" onPress={() => doAutoFuse({ stopAt: 'SSR' })} />
          </View>
        )}
        {petsUnlocked && Object.keys(state.pets.owned).length === 0 && <Text style={c.sub}>보유 펫 없음 — 소환으로 획득하세요.</Text>}
        {petsUnlocked && (
          <View style={c.tileGrid}>
            {Object.entries(state.pets.owned).map(([id, lv]) => (
              <Tile key={id} emoji={PETS[id].emoji} rarity={PETS[id].rarity} level={lv} label={PETS[id].label}
                active={state.pets.active.includes(id)} onPress={() => setDetail({ type: 'pet', id })} />
            ))}
          </View>
        )}
      </Card>

      {/* 유물 */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="h3" corner="tl" />
        <Text style={c.sec}>🏺 유물 <Text style={c.dim}>(계정 영구 성장 · 탭하여 강화)</Text></Text>
        <View style={c.tileGrid}>
          {Object.values(RELICS).map((r) => (
            <Tile key={r.id} emoji={r.emoji} rarity={r.rarity} level={(state.relics && state.relics[r.id]) || 0} label={r.label}
              onPress={() => setDetail({ type: 'relic', id: r.id })} />
          ))}
        </View>
      </Card>

      {/* 엠블럼 */}
      <Card style={{ marginTop: 12 }}>
        <CodeTag id="h4" corner="tl" />
        <Text style={c.sec}>🎖️ 엠블럼 <Text style={c.dim}>(문장 · 계정 공유)</Text></Text>
        {!emblemUnlocked && <Text style={c.sub}>🔒 스테이지 {unlockStage('emblem')} 도달 시 해금</Text>}
        {emblemUnlocked && <Text style={c.sub}>{emblemComplete(state) ? `✨ 도감 완성 · 전투력 +${Math.round(EMBLEM_COMPLETE_BONUS * 100)}%` : '전 문장 1레벨↑ 수집 시 완성 보너스'}</Text>}
        {emblemUnlocked && (
          <View style={c.tileGrid}>
            {Object.values(EMBLEMS).map((e) => (
              <Tile key={e.id} emoji={e.emoji} rarity={e.rarity} level={(state.emblems && state.emblems[e.id]) || 0} label={e.label}
                onPress={() => setDetail({ type: 'emblem', id: e.id })} />
            ))}
          </View>
        )}
      </Card>

      {/* 정령 */}
      <Card style={{ marginTop: 12, marginBottom: 12 }}>
        <CodeTag id="h5" corner="tl" />
        <View style={c.petHead}>
          <Text style={c.sec}>🧚 정령 <Text style={c.dim}>(장착 {state.guardians.active.length}/{MAX_ACTIVE_GUARDIANS})</Text></Text>
        </View>
        {!guardUnlocked && <Text style={c.sub}>🔒 스테이지 {unlockStage('guardian')} 도달 시 해금</Text>}
        {/* 소환은 소환 탭 › 🧚정령으로 이동 — 여기선 장착·관리만. */}
        {guardUnlocked && Object.keys(state.guardians.owned).length === 0 && <Text style={c.sub}>보유 정령 없음 — 소환 탭 › 🧚정령에서 획득하세요.</Text>}
        {guardUnlocked && (
          <View style={c.tileGrid}>
            {Object.entries(state.guardians.owned).map(([id, lv]) => (
              <Tile key={id} emoji={GUARDIANS[id].emoji} rarity={GUARDIANS[id].rarity} level={lv} label={GUARDIANS[id].label}
                active={state.guardians.active.includes(id)} onPress={() => setDetail({ type: 'guardian', id })} />
            ))}
          </View>
        )}
      </Card>

      {/* 상세 팝업 — 변경 전후 능력치 비교 */}
      <Modal transparent animationType="fade" visible={!!info} onRequestClose={() => setDetail(null)}>
        <TouchableOpacity style={c.backdrop} activeOpacity={1} onPress={() => setDetail(null)}>
          <TouchableOpacity style={c.modalCard} activeOpacity={1} onPress={() => {}}>
            {info && (<>
              <View style={c.mHead}>
                <Text style={c.mEmoji}>{info.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={c.mName}>{info.name}{isOn('rarity') && info.rarity ? <Text style={rarityText(info.rarity)}> {info.rarity} </Text> : null}</Text>
                  <Text style={c.mSub}>{info.sub}</Text>
                </View>
              </View>
              {/* 변경 전후 비교 */}
              <View style={c.compareBox}>
                <View style={c.compareCol}>
                  <Text style={c.compareLbl}>{info.compare.curLabel}</Text>
                  <Text style={c.compareCur}>{info.compare.cur}</Text>
                </View>
                <Text style={c.compareArrow}>→</Text>
                <View style={c.compareCol}>
                  <Text style={c.compareLbl}>{info.compare.nextLabel}</Text>
                  <Text style={c.compareNext}>{info.compare.next}</Text>
                </View>
              </View>
              <Text style={c.compareDelta}>{info.compare.delta}</Text>
              <View style={{ height: 12 }} />
              {info.actions}
              <View style={{ height: 8 }} />
              <Btn kind="ghost" label="닫기" onPress={() => setDetail(null)} />
            </>)}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const c = StyleSheet.create({
  sec: { color: T.text, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  sub: { color: T.muted, fontSize: 12, marginBottom: 8 },
  dim: { color: T.muted, fontSize: 12, fontWeight: '400' },
  petHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  fuseRow: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 2, flexWrap: 'wrap' },
  matBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  matChip: { color: T.muted, fontSize: 11, fontWeight: '700', backgroundColor: T.surface2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  msg: { color: T.accent, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  // 아이콘 타일
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tile: { width: 64, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.line, gap: 2 },
  tileEmoji: { fontSize: 24 },
  tileLv: { color: T.text, fontSize: 10, fontWeight: '800' },
  tileActive: { position: 'absolute', top: 2, right: 3, fontSize: 11, zIndex: 2 },
  // 상세 팝업
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: T.surface, borderRadius: 20, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: T.line },
  mHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mEmoji: { fontSize: 40 },
  mName: { color: T.text, fontSize: 17, fontWeight: '900' },
  mSub: { color: T.muted, fontSize: 12, marginTop: 2 },
  mToggle: { alignItems: 'flex-end', marginBottom: 8 },
  compareBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: T.surface2, borderRadius: 12, padding: 14, marginTop: 12 },
  compareCol: { alignItems: 'center', minWidth: 72 },
  compareLbl: { color: T.muted, fontSize: 11, marginBottom: 4 },
  compareCur: { color: T.text, fontSize: 20, fontWeight: '800' },
  compareNext: { color: T.good, fontSize: 20, fontWeight: '900' },
  compareArrow: { color: T.accent, fontSize: 20, fontWeight: '900' },
  compareDelta: { color: T.accent, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 8 },
});
