/**
 * Seed file — jalankan sekali untuk buat user admin pertama
 * Command: npm run db:seed
 */

import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 12);

  await db
    .insert(users)
    .values([
      {
        username: "admin",
        passwordHash,
        fullName: "Administrator",
        role: "admin",
      },
      {
        username: "manager",
        passwordHash: await bcrypt.hash("manager123", 12),
        fullName: "Project Manager",
        role: "manager",
      },
      {
        username: "staff",
        passwordHash: await bcrypt.hash("staff123", 12),
        fullName: "Staff Lapangan",
        role: "staff",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Seed selesai!");
  console.log("");
  console.log("Default users:");
  console.log("  admin   / admin123");
  console.log("  manager / manager123");
  console.log("  staff   / staff123");
  console.log("");
  console.log("⚠️  GANTI PASSWORD setelah pertama login!");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
