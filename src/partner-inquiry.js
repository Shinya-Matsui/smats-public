// β導入パートナー申込フォーム受付ハンドラ
//
// smats.jp（信頼ハブ）のβ導入パートナー募集フォームからの応募を、
// ip-quiz D1（gliders-learn と共用）の partner_inquiries に保存し、
// Resend 経由で info@gliders.co.jp へ通知する。認証不要の公開エンドポイント。
//
// worker.js から POST /api/partner-inquiry のときに呼ばれる。

export async function handlePartnerInquiry(request, env) {
  const db = env.IP_QUIZ_DB;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { company, name, email, job_title, size, message, source } = body;

  // バリデーション（必須項目）
  if (!company || !name || !email) {
    return Response.json({ error: "会社名・担当者名・メールアドレスは必須です" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
  }

  // 簡易スパム対策: 各フィールドの長さ制限
  if (company.length > 200 || name.length > 100 || email.length > 254) {
    return Response.json({ error: "入力値が長すぎます" }, { status: 400 });
  }
  if (job_title && job_title.length > 100) {
    return Response.json({ error: "入力値が長すぎます" }, { status: 400 });
  }
  if (message && message.length > 2000) {
    return Response.json({ error: "メッセージは2000文字以内でお願いします" }, { status: 400 });
  }

  const trimmed = {
    company: company.trim(),
    name: name.trim(),
    email: email.trim(),
    job_title: job_title ? job_title.trim() : null,
    size: size || null,
    message: message ? message.trim() : null,
    source: source ? String(source).slice(0, 100) : null,
  };

  // D1に保存
  try {
    await db.prepare(`
      INSERT INTO partner_inquiries (company, name, email, job_title, size, message, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      trimmed.company,
      trimmed.name,
      trimmed.email,
      trimmed.job_title,
      trimmed.size,
      trimmed.message,
      trimmed.source,
    ).run();
  } catch (err) {
    console.error("D1 insert error:", err);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  // Resendでメール通知（失敗してもユーザーにはエラーを返さない）
  const resendKey = env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Gliders Learn <noreply@gliders.co.jp>",
          to: ["info@gliders.co.jp"],
          reply_to: trimmed.email,
          subject: `【β導入パートナー】${trimmed.company}`,
          text: [
            "=== β導入パートナー応募 (smats.jp) ===",
            "",
            `会社名: ${trimmed.company}`,
            `担当者名: ${trimmed.name}`,
            `メール: ${trimmed.email}`,
            `役職: ${trimmed.job_title || "（未入力）"}`,
            `従業員規模: ${trimmed.size || "未選択"}`,
            `流入元: ${trimmed.source || "（不明）"}`,
            "",
            "--- メッセージ ---",
            trimmed.message || "（なし）",
            "",
            "---",
            "このメールは smats.jp のβ導入パートナー募集フォームから自動送信されています。",
          ].join("\n"),
        }),
      });
    } catch (err) {
      // メール送信失敗はログに記録するが、ユーザーにはエラーを返さない
      console.error("Resend email error:", err);
    }
  }

  return Response.json({ ok: true });
}
