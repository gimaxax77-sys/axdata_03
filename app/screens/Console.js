import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { T } from '../theme';
import { Btn } from '../components';
import { ROLE_LABEL } from '../../system/core/roles.mjs';
import { buildNoticeConfig, buildEventConfig, buildMailPayload, consoleCapabilities, NOTICE_MAX } from '../../system/core/console.mjs';

const MAIL_FIELDS = [
  { key: 'currency', label: '골드' },
  { key: 'gem', label: '다이아' },
  { key: 'summon', label: '소환권' },
  { key: 'growth', label: '성장' },
];

// 운영자 콘솔 — 매니저/운영자가 공지·이벤트·우편을 발송.
//   공지/이벤트는 원격 설정에 기록, 우편은 전체 유저에게 재화 첨부 발송.
export function ConsoleModal({ visible, onClose, role, remote, onSet, onClear, onSendMail }) {
  const cap = consoleCapabilities(role);
  const [notice, setNotice] = useState('');
  const [event, setEvent] = useState('');
  const [mailTitle, setMailTitle] = useState('');
  const [mailRewards, setMailRewards] = useState({});
  const [msg, setMsg] = useState(null);

  const curNotice = remote && remote.notice ? remote.notice.text : null;
  const curEvent = remote && remote.event ? remote.event.text : null;

  const flash = (r, okText) => setMsg(r && r.ok ? { ok: true, t: okText } : { ok: false, t: (r && r.reason) || '실패' });
  // 결과를 확실히 보이게 팝업으로도 알림(웹은 window.alert, 네이티브는 Alert).
  const notify = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const postNotice = async () => {
    const b = buildNoticeConfig(notice);
    if (!b.ok) { setMsg({ ok: false, t: b.reason }); return; }
    flash(await onSet(b.key, b.value), '공지를 발송했습니다'); setNotice('');
  };
  const postEvent = async () => {
    const b = buildEventConfig(event);
    if (!b.ok) { setMsg({ ok: false, t: b.reason }); return; }
    flash(await onSet(b.key, b.value), '이벤트를 발송했습니다'); setEvent('');
  };
  const postMail = async () => {
    const b = buildMailPayload({ title: mailTitle, rewards: mailRewards });
    if (!b.ok) { setMsg({ ok: false, t: b.reason }); notify('우편 발송', b.reason); return; }
    const r = await (onSendMail ? onSendMail({ targetUserId: null, title: b.title, rewards: b.rewards }) : { ok: false, reason: '연결 안 됨(로그인 확인)' });
    flash(r, '전체 우편을 발송했습니다');
    notify('우편 발송', r && r.ok ? '전체 우편을 발송했습니다.' : `발송 실패: ${(r && r.reason) || '알 수 없는 오류'}`);
    if (r && r.ok) { setMailTitle(''); setMailRewards({}); }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={c.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={c.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={c.titleRow}>
              <Text style={c.title}>🛠 운영자 콘솔</Text>
              <Text style={[c.badge, role === 'admin' && c.badgeAdmin]}>{ROLE_LABEL[role] || '일반'}</Text>
            </View>
            <Text style={c.lead}>공지·이벤트를 발송하면 모든 플레이어의 화면 상단 배너에 표시됩니다.</Text>

            {/* 공지 */}
            {cap.notice && (<>
              <View style={c.divider} />
              <Text style={c.sec}>📢 공지</Text>
              <Text style={c.cur}>{curNotice ? `현재: ${curNotice}` : '현재 게시된 공지 없음'}</Text>
              <TextInput style={c.input} value={notice} onChangeText={setNotice} multiline
                placeholder={`공지 내용 (최대 ${NOTICE_MAX}자)`} placeholderTextColor={T.muted} />
              <View style={c.row}>
                <View style={{ flex: 1 }}><Btn small kind="gold" label="공지 발송" onPress={postNotice} /></View>
                {curNotice && <View style={{ flex: 1 }}><Btn small kind="ghost" label="내리기" onPress={async () => flash(await onClear('notice'), '공지를 내렸습니다')} /></View>}
              </View>
            </>)}

            {/* 이벤트 */}
            {cap.event && (<>
              <View style={c.divider} />
              <Text style={c.sec}>🎉 이벤트 배너</Text>
              <Text style={c.cur}>{curEvent ? `현재: ${curEvent}` : '현재 게시된 이벤트 없음'}</Text>
              <TextInput style={c.input} value={event} onChangeText={setEvent} multiline
                placeholder={`이벤트 문구 (최대 ${NOTICE_MAX}자)`} placeholderTextColor={T.muted} />
              <View style={c.row}>
                <View style={{ flex: 1 }}><Btn small kind="gold" label="이벤트 발송" onPress={postEvent} /></View>
                {curEvent && <View style={{ flex: 1 }}><Btn small kind="ghost" label="내리기" onPress={async () => flash(await onClear('event'), '이벤트를 내렸습니다')} /></View>}
              </View>
            </>)}

            {/* 우편 발송 */}
            {cap.notice && onSendMail && (<>
              <View style={c.divider} />
              <Text style={c.sec}>📬 우편 발송 <Text style={c.dim}>(전체 유저)</Text></Text>
              <TextInput style={c.input} value={mailTitle} onChangeText={setMailTitle}
                placeholder="우편 제목 (예: 점검 보상)" placeholderTextColor={T.muted} />
              <View style={c.rewardGrid}>
                {MAIL_FIELDS.map((f) => (
                  <View key={f.key} style={c.rewardCell}>
                    <Text style={c.rewardLabel}>{f.label}</Text>
                    <TextInput style={c.rewardInput} keyboardType="numeric"
                      value={mailRewards[f.key] != null ? String(mailRewards[f.key]) : ''}
                      onChangeText={(v) => setMailRewards((r) => ({ ...r, [f.key]: v.replace(/[^0-9]/g, '') }))}
                      placeholder="0" placeholderTextColor={T.muted} />
                  </View>
                ))}
              </View>
              <View style={[c.row, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}><Btn small kind="gold" label="전체 우편 발송" onPress={postMail} /></View>
              </View>
            </>)}

            {msg ? <Text style={[c.msg, !msg.ok && c.err]}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</Text> : null}

            <Text style={c.note}>발송 즉시 서버(remote_config)에 기록되고, 다른 플레이어는 다음 실행(또는 동기화) 시 배너로 봅니다. 매니저는 공지·이벤트만, 밸런스 조정은 운영자 조작 화면에서 합니다.</Text>

            <View style={{ height: 10 }} />
            <Btn label="닫기" onPress={onClose} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const c = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, borderTopWidth: 1, borderColor: T.line, maxHeight: '86%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  title: { color: T.text, fontWeight: '900', fontSize: 20 },
  badge: { color: '#7fd3ff', backgroundColor: 'rgba(127,211,255,0.15)', fontWeight: '800', fontSize: 11, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeAdmin: { color: '#ffd257', backgroundColor: 'rgba(255,210,87,0.15)' },
  lead: { color: T.muted, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  divider: { height: 1, backgroundColor: T.line, marginVertical: 14 },
  sec: { color: T.text, fontWeight: '800', fontSize: 15, marginBottom: 6 },
  cur: { color: T.accent, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: T.surface2, borderRadius: 10, borderWidth: 1, borderColor: T.line, color: T.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, minHeight: 44, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  msg: { color: T.accent, fontSize: 13, fontWeight: '800', marginTop: 12 },
  err: { color: '#ff8a8a' },
  note: { color: T.muted, fontSize: 11, marginTop: 12, lineHeight: 16 },
  dim: { color: T.muted, fontSize: 12, fontWeight: '600' },
  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rewardCell: { flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface2, borderRadius: 10, borderWidth: 1, borderColor: T.line, paddingHorizontal: 10, paddingVertical: 6 },
  rewardLabel: { color: T.text, fontSize: 12, fontWeight: '700', width: 44 },
  rewardInput: { flex: 1, color: T.text, fontSize: 13, fontWeight: '700', paddingVertical: 4, textAlign: 'right' },
});
