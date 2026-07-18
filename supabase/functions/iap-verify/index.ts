// ─────────────────────────────────────────────────────────────
// Edge Function: iap-verify — 인앱결제 영수증 서버 검증(골격)
//
//   흐름: 클라이언트가 로그인 토큰 + { platform, productId, token } 전송
//        → 이 함수가 (1) 로그인 사용자 확인
//                   (2) 스토어(Apple/Google) 영수증 검증  ← 실제 검증은 TODO
//                   (3) purchases 테이블에 결과 기록(service_role, RLS 우회)
//                   → { ok, productId, status } 반환
//
//   배포:  supabase functions deploy iap-verify
//   비밀:  supabase secrets set APPLE_SHARED_SECRET=... GOOGLE_SA_JSON=...
//   ⚠ 이 함수만 service_role 키를 쓴다(환경변수로 자동 주입). 절대 클라이언트에 두지 말 것.
// ─────────────────────────────────────────────────────────────

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const { platform, productId, token } = await req.json();
    if (!platform || !productId) {
      return json({ ok: false, reason: 'missing-fields' }, 400);
    }

    // service_role 클라이언트(RLS 우회) — Edge 런타임에 자동 주입되는 환경변수 사용.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // (1) 로그인 사용자 확인 — 클라이언트가 보낸 JWT로 본인 식별.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, reason: 'no-user' }, 401);

    // (2) 스토어 영수증 검증 — TODO: 실제 검증 채우기.
    //   iOS  : POST https://buy.itunes.apple.com/verifyReceipt (APPLE_SHARED_SECRET)
    //   Android: Google Play Developer API purchases.products.get (GOOGLE_SA_JSON)
    //   지금은 골격: token 존재 여부만 확인하는 임시 통과(프로덕션 전 반드시 교체).
    const verified = !!token; // ← 임시. 실제 스토어 검증 결과로 대체할 것.
    const status = verified ? 'verified' : 'failed';

    // (3) 결과 기록.
    const { error } = await admin.from('purchases').insert({
      user_id: user.id,
      platform, product_id: productId, token: token ?? null,
      status, verified_at: verified ? new Date().toISOString() : null,
    });
    if (error) return json({ ok: false, reason: error.message }, 500);

    return json({ ok: verified, productId, status });
  } catch (e) {
    return json({ ok: false, reason: String(e?.message || e) }, 500);
  }

  function json(body: unknown, code = 200) {
    return new Response(JSON.stringify(body), {
      status: code, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
