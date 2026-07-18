import { Platform } from 'react-native';
import { productForPackage } from '../system/core/iap.mjs';
import { cloudAvailable, cloudVerifyPurchase } from './backend/cloud';
import { resolvePurchase, purchaseStatusText } from './backend/purchaseFlow.mjs';

// ─────────────────────────────────────────────────────────────
// 결제 어댑터 — "스토어 결제 → 서버 검증 → 지급" 흐름을 잇는다.
//   1) 스토어 결제(mock: 웹/개발)
//   2) 서버 검증(백엔드 설정 시): Cloud Function iapVerify
//   3) resolvePurchase 로 지급 여부 판정 → 호출측이 grant일 때만 shop.purchase
// 결제와 지급을 분리해, UI는 어댑터만 부르고 지급은 shop.purchase가 담당한다.
// ─────────────────────────────────────────────────────────────

let IAP = null;
try { IAP = require('expo-in-app-purchases'); } catch { IAP = null; }

export function isStoreAvailable() {
  return !!IAP && Platform.OS !== 'web';
}

// 스토어 결제 단계 → { ok, mock?, token?, reason? }.
async function storePurchase(product) {
  if (!isStoreAvailable()) return { ok: true, mock: true }; // 웹/개발: 모의
  // TODO(실결제 연동): expo-in-app-purchases 예시
  //   await IAP.connectAsync();
  //   const sku = Platform.OS === 'ios' ? product.ios : product.android;
  //   await IAP.getProductsAsync([sku]);
  //   const res = await IAP.purchaseItemAsync(sku);
  //   const r = res.results?.[0];
  //   if (res.responseCode !== IAP.IAPResponseCode.OK) return { ok:false, reason:'취소' };
  //   return { ok:true, token: r.purchaseToken || r.transactionReceipt };
  // 현재는 스토어 모듈 미연동 골격 → mock.
  return { ok: true, mock: true };
}

// 패키지 결제 실행. 반환 { grant, status, reason, token }.
//   grant=true 일 때만 호출측이 shop.purchase(state, pkgId)로 지급한다.
export async function purchasePackage(pkgId) {
  const product = productForPackage(pkgId);
  if (!product) return { grant: false, status: 'unknown-product', reason: '알 수 없는 상품' };

  // 1) 스토어 결제
  const store = await storePurchase(product);

  // 2) 서버 검증 (실 결제 + 백엔드 설정 시에만)
  const avail = cloudAvailable();
  let verify = null;
  if (store.ok && !store.mock && avail) {
    verify = await cloudVerifyPurchase({ platform: Platform.OS, productId: pkgId, token: store.token });
  }

  // 3) 지급 판정
  const decision = resolvePurchase({
    storeOk: store.ok, mock: !!store.mock, cloudAvailable: avail,
    verifyOk: verify ? verify.ok : undefined, verifyReason: verify ? verify.reason : undefined,
  });
  return { ...decision, token: store.token, text: purchaseStatusText(decision.status) };
}

export { purchaseStatusText };
