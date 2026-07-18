import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { T } from '../theme';
import { Btn } from '../components';
import { t, LANGS } from '../i18n';
import { ROLE_LABEL } from '../../system/core/roles.mjs';

// 온오프 토글 행
function Toggle({ label, desc, value, onChange }) {
  return (
    <TouchableOpacity style={c.row} activeOpacity={0.8} onPress={() => onChange(!value)}>
      <View style={{ flex: 1 }}>
        <Text style={c.label}>{label}</Text>
        {desc ? <Text style={c.desc}>{desc}</Text> : null}
      </View>
      <View style={[c.track, value && c.trackOn]}>
        <View style={[c.knob, value && c.knobOn]} />
      </View>
    </TouchableOpacity>
  );
}

// 세이브 문자열을 클립보드에 복사 (expo-clipboard → 웹 navigator 폴백).
async function copyText(str) {
  try { const C = require('expo-clipboard'); await C.setStringAsync(str); return true; } catch { /* noop */ }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(str); return true; }
  } catch { /* noop */ }
  return false;
}

export function SettingsModal({ visible, settings, onChange, onReset, onClose, onExport, onImport, onOpenAdmin, onOpenConsole, cloud, onSync, onSignOut, onSignUp, onSignInEmail }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const doSignIn = async () => {
    if (!onSignInEmail) return;
    const r = await onSignInEmail({ email: email.trim(), password: pw });
    if (r && r.ok) setPw('');
  };
  const doSignUp = async () => {
    if (!onSignUp) return;
    const r = await onSignUp({ email: email.trim(), password: pw });
    if (r && r.ok) setPw('');
  };

  const doExport = async () => {
    try {
      const c2 = onExport ? onExport() : '';
      const ok = await copyText(c2);
      setMsg(ok ? t('copied') : c2); // 복사 실패 시 코드 자체를 노출
    } catch (e) {
      // 내보내기 실패가 앱을 죽이지 않게 — 원인을 화면에 노출.
      setMsg('내보내기 오류: ' + String(e && e.message || e));
    }
  };
  const doImport = () => {
    if (!onImport) return;
    const ok = onImport(code.trim());
    setMsg(ok ? t('import_ok') : t('import_fail'));
    if (ok) { setCode(''); }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={c.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={c.sheet}>
          <Text style={c.title}>⚙️ {t('settings')}</Text>

          <Toggle label={t('sound')} desc={t('sound_desc')} value={!settings.muted} onChange={(v) => onChange('muted', !v)} />
          <Toggle label={t('haptic')} desc={t('haptic_desc')} value={settings.haptics} onChange={(v) => onChange('haptics', v)} />
          <Toggle label={t('battle_fx')} desc={t('battle_fx_desc')} value={!settings.reduceMotion} onChange={(v) => onChange('reduceMotion', !v)} />
          <Toggle label={t('eco_mode')} desc={t('eco_mode_desc')} value={!!settings.ecoMode} onChange={(v) => onChange('ecoMode', v)} />
          <Toggle label="UI 코드 표시(개발)" desc="화면에 요소 코드(a1~z2) 오버레이 — 수정 위치 지목용" value={!!settings.uiCodes} onChange={(v) => onChange('uiCodes', v)} />

          {/* 언어 */}
          <View style={c.langRow}>
            <Text style={c.label}>{t('language')}</Text>
            <View style={c.langPicker}>
              {LANGS.map((l) => {
                const on = (settings.lang || 'ko') === l.id;
                return (
                  <TouchableOpacity key={l.id} style={[c.langCell, on && c.langCellOn]} activeOpacity={0.8}
                    onPress={() => onChange('lang', l.id)}>
                    <Text style={[c.langText, on && c.langTextOn]}>{l.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 계정 · 클라우드 세이브 */}
          {cloud && cloud.available && (<>
            <View style={c.divider} />
            <Text style={c.sec}>☁️ 계정 · 클라우드 세이브</Text>
            {cloud.user ? (<>
              <View style={c.acctRow}>
                <Text style={c.acctEmail} numberOfLines={1}>{cloud.user.email || '로그인됨'}</Text>
                <Text style={[c.roleBadge, cloud.role === 'admin' && c.roleAdmin, cloud.role === 'manager' && c.roleManager]}>
                  {ROLE_LABEL[cloud.role] || '일반'}
                </Text>
              </View>
              <Text style={c.note}>{cloud.status === 'syncing' ? '동기화 중…' : (cloud.msg || '동기화 완료')}</Text>
              <View style={c.transferRow}>
                <View style={{ flex: 1 }}><Btn small kind="gold" label="지금 동기화" onPress={onSync} /></View>
                <View style={{ flex: 1 }}><Btn small kind="ghost" label="로그아웃" onPress={onSignOut} /></View>
              </View>
            </>) : (<>
              <Text style={c.note}>이메일로 로그인하면 진행이 기기 밖에 안전하게 보관되고, 다른 기기와 동기화됩니다.</Text>
              <TextInput style={c.input} value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={T.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
              <View style={{ height: 8 }} />
              <TextInput style={c.input} value={pw} onChangeText={setPw} placeholder="비밀번호" placeholderTextColor={T.muted} autoCapitalize="none" autoCorrect={false} secureTextEntry />
              <View style={[c.transferRow, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}><Btn small kind="gold" label="로그인" onPress={doSignIn} /></View>
                <View style={{ flex: 1 }}><Btn small kind="ghost" label="가입" onPress={doSignUp} /></View>
              </View>
              {cloud.status === 'error' && cloud.msg ? <Text style={c.err}>{cloud.msg}</Text> : null}
            </>)}
          </>)}

          {/* 세이브 이관 */}
          <View style={c.divider} />
          <Text style={c.sec}>{t('transfer')}</Text>
          <View style={c.transferRow}>
            <View style={{ flex: 1 }}><Btn small kind="gold" label={t('export_save')} onPress={doExport} /></View>
            <View style={{ flex: 1 }}><Btn small kind="ghost" label={t('import_save')} onPress={doImport} /></View>
          </View>
          <TextInput
            style={c.input}
            value={code}
            onChangeText={setCode}
            placeholder={t('import_placeholder')}
            placeholderTextColor={T.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {msg ? <Text style={c.msg}>{msg}</Text> : null}
          <Text style={c.note}>{t('transfer_note')}</Text>

          {/* 데이터 */}
          <View style={c.divider} />
          <Text style={c.sec}>{t('data')}</Text>
          <Btn label={t('reset')} kind="ghost" onPress={onReset} />
          <Text style={c.note}>{t('reset_note')}</Text>

          {onOpenConsole && (<>
            <View style={c.divider} />
            <Btn label="🛠 운영자 콘솔 (공지·이벤트)" kind="gold" onPress={onOpenConsole} />
          </>)}

          {onOpenAdmin && (<>
            <View style={c.divider} />
            <Btn label="🛠 운영자 조작 (배수/배율 튜닝)" kind="ghost" onPress={onOpenAdmin} />
          </>)}

          <Text style={c.ver}>엘드리아 연대기 · v1.0.0</Text>
          <View style={{ height: 6 }} />
          <Btn label={t('close')} onPress={onClose} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const c = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, borderTopWidth: 1, borderColor: T.line },
  title: { color: T.text, fontWeight: '900', fontSize: 20, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.line },
  label: { color: T.text, fontWeight: '700', fontSize: 15 },
  desc: { color: T.muted, fontSize: 12, marginTop: 2 },
  track: { width: 46, height: 28, borderRadius: 14, backgroundColor: T.surface2, padding: 3, justifyContent: 'center' },
  trackOn: { backgroundColor: T.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.muted },
  knobOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.line },
  langPicker: { flexDirection: 'row', backgroundColor: T.surface2, borderRadius: 10, padding: 3, gap: 3 },
  langCell: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  langCellOn: { backgroundColor: T.primary },
  langText: { color: T.muted, fontWeight: '700', fontSize: 13 },
  langTextOn: { color: '#fff' },
  divider: { height: 1, backgroundColor: T.line, marginVertical: 14 },
  sec: { color: T.text, fontWeight: '800', fontSize: 14, marginBottom: 8 },
  transferRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { backgroundColor: T.surface2, borderRadius: 10, borderWidth: 1, borderColor: T.line, color: T.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  msg: { color: T.accent, fontSize: 12, fontWeight: '700', marginTop: 8 },
  err: { color: '#ff8a8a', fontSize: 12, fontWeight: '700', marginTop: 8 },
  note: { color: T.muted, fontSize: 11, marginTop: 8, lineHeight: 16 },
  acctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  acctEmail: { color: T.text, fontWeight: '800', fontSize: 14, flex: 1 },
  roleBadge: { color: T.muted, backgroundColor: T.surface2, fontWeight: '800', fontSize: 11, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  roleManager: { color: '#7fd3ff', backgroundColor: 'rgba(127,211,255,0.15)' },
  roleAdmin: { color: '#ffd257', backgroundColor: 'rgba(255,210,87,0.15)' },
  ver: { color: T.muted, fontSize: 12, textAlign: 'center', marginTop: 18 },
});
