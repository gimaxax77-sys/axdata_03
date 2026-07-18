import { SHOP } from './shop.mjs';

// ─────────────────────────────────────────────────────────────
// 인앱 결제(IAP) 상품 매핑 — 게임 상품 ↔ 스토어 SKU.
//   실 결제 모듈(expo-in-app-purchases / react-native-iap / RevenueCat)이
//   이 SKU로 상품을 조회·결제하고, 성공 콜백에서 shop.purchase(state, id)로
//   보상을 지급한다. SHOP.package(실결제 상품)에서 자동 파생해 드리프트를 막는다.
// ─────────────────────────────────────────────────────────────

export const IAP_PRODUCTS = Object.fromEntries(
  SHOP.package.map((p) => [p.id, {
    id: p.id,
    label: p.label,
    price: p.krw,
    ios: `eldria.${p.id.toLowerCase()}`,     // App Store product id
    android: p.id.toLowerCase(),              // Google Play product id
    consumable: !p.once,                      // 1회성(once)은 non-consumable
  }])
);

export function productForPackage(id) {
  return IAP_PRODUCTS[id] || null;
}

// 플랫폼별 등록해야 할 스토어 SKU 목록 (스토어 콘솔 상품 등록/조회용).
export function storeSkus(platform) {
  return Object.values(IAP_PRODUCTS).map((p) => (platform === 'ios' ? p.ios : p.android));
}
