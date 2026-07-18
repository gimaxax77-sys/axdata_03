import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { T } from '../theme';
import { Btn } from '../components';

// 공지/이벤트 팝업 — 접속 시 새 공지가 있으면 화면 가운데 모달로 띄운다.
//   한 번 확인하면(설정에 서명 저장) 같은 공지로는 다시 뜨지 않는다.
export function NoticePopup({ visible, notice, event, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={c.backdrop}>
        <View style={c.card}>
          <View style={c.head}>
            <Text style={c.headIcon}>📢</Text>
            <Text style={c.headTitle}>공지</Text>
          </View>

          {notice ? <Text style={c.body}>{notice}</Text> : null}
          {event ? (
            <View style={c.eventBox}>
              <Text style={c.eventText}>🎉 {event}</Text>
            </View>
          ) : null}

          <View style={{ height: 16 }} />
          <Btn label="확인" kind="gold" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const c = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.66)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  card: { width: '100%', maxWidth: 380, backgroundColor: T.surface, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: T.accent },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.line },
  headIcon: { fontSize: 20 },
  headTitle: { color: T.text, fontWeight: '900', fontSize: 18 },
  body: { color: T.text, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  eventBox: { marginTop: 12, backgroundColor: T.surface2, borderRadius: 12, borderWidth: 1, borderColor: T.line, paddingHorizontal: 14, paddingVertical: 12 },
  eventText: { color: T.accent, fontSize: 14, fontWeight: '800', lineHeight: 20 },
});
