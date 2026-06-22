// src/lib/telegram.ts

export async function sendTelegramNotification(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("⚠️ [Telegram Notifier] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum dikonfigurasi di env.");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ [Telegram Notifier] Gagal mengirim pesan ke Telegram: ${errText}`);
      return false;
    }

    console.log("✅ [Telegram Notifier] Berhasil mengirim pesan notifikasi.");
    return true;
  } catch (err) {
    console.error("❌ [Telegram Notifier] Terjadi kesalahan saat fetch:", err);
    return false;
  }
}
