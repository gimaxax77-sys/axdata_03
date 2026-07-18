// ─────────────────────────────────────────────────────────────
// 결제 지급 판정 — "스토어 결제 → 서버 검증 → 지급" 게이팅의 순수 로직.
//   UI/네이티브 모듈과 분리해 테스트 가능하게 둔다.
//
// 입력:
//   storeOk        : 스토어 결제 성공 여부
//   mock           : 스토어 모듈 없음(웹/개발) → 모의 결제
//   cloudAvailable : 서버 검증 가능 여부(백엔드 설정 시 true)
//   verifyOk       : 서버 검증 통과 여부
//   verifyReason   : 검증 실패/중복 사유('already-granted' 등)
//
// 반환: { grant, status, reason }
//   grant=true 일 때만 보상(shop.purchase)을 지급한다.
// ─────────────────────────────────────────────────────────────

export function resolvePurchase({ storeOk, mock = false, cloudAvailable = false, verifyOk, verifyReason } = {}) {
  if (!storeOk) return { grant: false, status: 'store-failed', reason: '결제 실패/취소' };

  // 웹/개발: 실 스토어 없음 → 모의 지급(검증 생략).
  if (mock) return { grant: true, status: 'mock', reason: '모의 결제(개발)' };

  // 실 결제 + 서버 검증 가능 → 반드시 검증 통과해야 지급.
  if (cloudAvailable) {
    if (verifyOk) return { grant: true, status: 'verified', reason: '검증 완료' };
    if (verifyReason === 'already-granted') return { grant: false, status: 'already-granted', reason: '이미 지급된 결제' };
    return { grant: false, status: 'verify-failed', reason: verifyReason || '검증 실패' };
  }

  // 실 결제인데 서버 미설정 → 클라이언트 신뢰 폴백(플래그: 미검증).
  return { grant: true, status: 'unverified', reason: '서버 미설정(미검증 지급)' };
}

// 상태 → 사용자 표시 문구.
export function purchaseStatusText(status) {
  switch (status) {
    case 'verified': return '결제 완료 (검증됨)';
    case 'mock': return '결제 완료 (개발 모드)';
    case 'unverified': return '결제 완료 (서버 미설정)';
    case 'already-granted': return '이미 지급된 결제입니다';
    case 'verify-failed': return '결제 검증 실패 — 지급되지 않았습니다';
    case 'store-failed': return '결제가 취소되었습니다';
    case 'unknown-product': return '알 수 없는 상품';
    default: return '결제 처리';
  }
}
