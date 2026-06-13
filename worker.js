// smats.jp の Worker エントリ
//
// 静的アセット（index.html ほか）は assets 設定で自動配信され、
// 静的アセットにマッチしないパスだけこの Worker が実行される。
// ここでは β導入パートナー申込フォームの API のみを捌き、
// それ以外は静的アセット配信に委譲する。

import { handlePartnerInquiry } from "./src/partner-inquiry.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/partner-inquiry") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "POST" },
        });
      }
      return handlePartnerInquiry(request, env);
    }

    // それ以外は静的アセットへ委譲（通常はここに来る前にアセットが直接配信される）
    return env.ASSETS.fetch(request);
  },
};
