import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { T } from '../theme';
import { Btn } from '../components';
import { ADMIN_FIELDS, getBalanceValue, setBalanceValue, adjustField, resetAll, DEFAULTS } from '../../system/core/admin.mjs';

// ─────────────────────────────────────────────────────────────
// 운영자 조작 패널 — 밸런스 배수/배율을 라이브로 조정한다.
//   조정 즉시 BALANCE(전역)에 반영되고, state.admin.overrides에 기록되어
//   세이브·재접속 후에도 유지된다(useGame이 부팅 시 재적용).
// ─────────────────────────────────────────────────────────────
export function AdminModal({ visible, state, onClose, onChange }) {
  const [, force] = useState(0);
  const rerender = () => force((v) => v + 1);

  const bump = (field, dir) => {
    const val = adjustField(field, dir);
    state.admin = state.admin || { overrides: {} };
    if (val === DEFAULTS[field.path]) delete state.admin.overrides[field.path];
    else state.admin.overrides[field.path] = val;
    onChange(); // 세이브 + 앱 리렌더
    rerender();
  };
  const resetOne = (field) => {
    setBalanceValue(field.path, DEFAULTS[field.path]);
    if (state.admin) delete state.admin.overrides[field.path];
    onChange(); rerender();
  };
  const resetEverything = () => {
    resetAll();
    state.admin = { overrides: {} };
    onChange(); rerender();
  };

  const overrideCount = state.admin ? Object.keys(state.admin.overrides || {}).length : 0;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={c.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={c.sheet}>
          <Text style={c.title}>🛠 운영자 조작 <Text style={c.warn}>· 밸런스 배수/배율</Text></Text>
          <Text style={c.note}>조정은 즉시 전 시스템에 반영되고 세이브에 유지됩니다. 변경 {overrideCount}건.</Text>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingVertical: 4 }}>
            {ADMIN_FIELDS.map((f) => {
              const val = getBalanceValue(f.path);
              const changed = state.admin && state.admin.overrides[f.path] !== undefined;
              return (
                <View key={f.path} style={c.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[c.label, changed && c.labelChanged]}>{f.label}{changed ? ' •' : ''}</Text>
                    <Text style={c.val}>{f.fmt ? f.fmt(val) : val}</Text>
                  </View>
                  <View style={c.ctrls}>
                    <TouchableOpacity style={c.step} onPress={() => bump(f, -1)} activeOpacity={0.7}><Text style={c.stepTxt}>−</Text></TouchableOpacity>
                    <TouchableOpacity style={c.step} onPress={() => bump(f, +1)} activeOpacity={0.7}><Text style={c.stepTxt}>＋</Text></TouchableOpacity>
                    {changed && <TouchableOpacity style={c.reset} onPress={() => resetOne(f)} activeOpacity={0.7}><Text style={c.resetTxt}>↺</Text></TouchableOpacity>}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={{ height: 10 }} />
          <Btn label="전체 초기화" kind="ghost" onPress={resetEverything} />
          <View style={{ height: 6 }} />
          <Btn label="닫기" onPress={onClose} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const c = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, borderTopWidth: 1, borderColor: T.line },
  title: { color: T.text, fontWeight: '900', fontSize: 18 },
  warn: { color: T.danger, fontSize: 13, fontWeight: '700' },
  note: { color: T.muted, fontSize: 11, marginTop: 6, marginBottom: 10, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.line },
  label: { color: T.text, fontWeight: '700', fontSize: 13 },
  labelChanged: { color: T.accent },
  val: { color: T.muted, fontSize: 12, marginTop: 2, fontWeight: '700' },
  ctrls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { width: 38, height: 34, borderRadius: 9, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.line },
  stepTxt: { color: T.text, fontSize: 20, fontWeight: '800' },
  reset: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  resetTxt: { color: T.muted, fontSize: 16 },
});
