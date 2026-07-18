// 우편함 모달 — 어느 화면에서든 상단 우편 아이콘으로 열어 수령한다.
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { T } from '../theme';
import { Btn, fmt } from '../components';
import { mailList, unreadMailCount, claimMail, claimAllMail, clearClaimedMail } from '../../system/core/mailbox.mjs';
import { fx } from '../feedback';

export function MailboxModal({ visible, state, concept, bump, onClose }) {
  const mails = mailList(state);
  const unread = unreadMailCount(state);
  const claimedCount = mails.filter((m) => m.claimed).length;
  const claimOne = (id) => { const r = claimMail(state, id); fx(r.ok ? 'success' : 'error'); bump(); };
  const claimAll = () => { const r = claimAllMail(state); fx(r.ok ? 'success' : 'error'); bump(); };
  const clearClaimed = () => { const r = clearClaimedMail(state); fx(r.ok ? 'success' : 'error'); bump(); };
  const rewardText = (rw = {}) => [
    rw.gem ? `${concept.resources.gem.emoji}${rw.gem}` : '',
    rw.currency ? `${concept.resources.currency.emoji}${fmt(rw.currency)}` : '',
    rw.summon ? `${concept.resources.summon.emoji}${rw.summon}` : '',
    rw.growth ? `${concept.resources.growth.emoji}${fmt(rw.growth)}` : '',
  ].filter(Boolean).join('  ');

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={c.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={c.sheet}>
          <View style={c.head}>
            <Text style={c.title}>📬 우편함 {unread > 0 ? <Text style={c.dim}>{unread}통</Text> : null}</Text>
            {unread > 0 ? <Btn small kind="gold" label="전체 수령" onPress={claimAll} /> : null}
          </View>
          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
            {mails.length === 0 ? (
              <Text style={c.empty}>우편함이 비어 있습니다.</Text>
            ) : mails.map((m) => (
              <View key={m.id} style={[c.row, m.claimed && c.rowClaimed]}>
                <View style={{ flex: 1 }}>
                  <Text style={c.mailTitle} numberOfLines={1}>{m.title}</Text>
                  <Text style={c.mailReward}>{rewardText(m.reward) || '—'}</Text>
                </View>
                {m.claimed
                  ? <Text style={c.claimed}>수령완료</Text>
                  : <Btn small kind="ghost" label="수령" onPress={() => claimOne(m.id)} />}
              </View>
            ))}
          </ScrollView>
          <View style={{ height: 10 }} />
          {claimedCount > 0 ? (
            <>
              <Btn small kind="ghost" label={`🧹 읽은 우편 비우기 (${claimedCount}통)`} onPress={clearClaimed} />
              <View style={{ height: 8 }} />
            </>
          ) : null}
          <Btn label="닫기" onPress={onClose} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const c = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, borderTopWidth: 1, borderColor: T.line, maxHeight: '82%' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: T.text, fontWeight: '900', fontSize: 19 },
  dim: { color: T.muted, fontSize: 13, fontWeight: '700' },
  empty: { color: T.muted, fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: T.line },
  rowClaimed: { opacity: 0.5 },
  mailTitle: { color: T.text, fontWeight: '800', fontSize: 14 },
  mailReward: { color: T.accent, fontSize: 12.5, fontWeight: '700', marginTop: 3 },
  claimed: { color: T.muted, fontSize: 12, fontWeight: '700' },
});
