import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { sendTelegramNotification } from "../lib/telegram";

async function test() {
  console.log("📨 Mengirim pesan tes ke Telegram...");
  const message = `🎉 <b>Koneksi Kalla Beton Bot Berhasil!</b>\n\nSelamat, Bot Telegram Notifikasi Pintar Anda telah berhasil dikonfigurasi dan terhubung ke sistem <b>KB Precast Kalla Beton</b>.\n\nSistem sekarang siap mengirimkan alert otomatis!`;
  
  const success = await sendTelegramNotification(message);
  if (success) {
    console.log("✅ Pesan tes berhasil dikirim! Silakan periksa grup Telegram Anda.");
  } else {
    console.error("❌ Gagal mengirim pesan tes. Periksa kembali token dan chat ID Anda.");
  }
}

test();
