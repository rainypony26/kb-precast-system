import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🛠️ Starting custom database schema migration...");
  
  try {
    // 1. Add assistant_manager to enum
    console.log("1. Adding 'assistant_manager' to role enum...");
    try {
      await db.execute(sql`ALTER TYPE "role" ADD VALUE 'assistant_manager';`);
      console.log("   ✅ 'assistant_manager' role added successfully.");
    } catch (e: any) {
      if (e.message && e.message.includes("already exists")) {
        console.log("   ℹ️ 'assistant_manager' role already exists in enum.");
      } else {
        throw e;
      }
    }

    // 2. Add is_active column
    console.log("2. Adding 'is_active' column to users...");
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;`);
      console.log("   ✅ 'is_active' column added successfully.");
    } catch (e: any) {
      if (e.message && e.message.includes("already exists")) {
        console.log("   ℹ️ 'is_active' column already exists.");
      } else {
        throw e;
      }
    }

    // 3. Add profile_pic column
    console.log("3. Adding 'profile_pic' column to users...");
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN "profile_pic" text;`);
      console.log("   ✅ 'profile_pic' column added successfully.");
    } catch (e: any) {
      if (e.message && e.message.includes("already exists")) {
        console.log("   ℹ️ 'profile_pic' column already exists.");
      } else {
        throw e;
      }
    }

    // 4. Update supplier_purchase_order_items constraints
    console.log("4. Updating supplier_purchase_order_items foreign key constraint...");
    try {
      // Try to drop old constraint
      try {
        await db.execute(sql`ALTER TABLE "supplier_purchase_order_items" DROP CONSTRAINT IF EXISTS "supplier_purchase_order_items_po_id_supplier_purchase_orders_id";`);
        await db.execute(sql`ALTER TABLE "supplier_purchase_order_items" DROP CONSTRAINT IF EXISTS "supplier_purchase_order_items_po_id_supplier_purchase_orders_id_fk";`);
      } catch (dropErr) {
        console.log("   ℹ️ Drop constraints skipped or not found.");
      }

      // Add new constraint with cascade delete
      await db.execute(sql`
        ALTER TABLE "supplier_purchase_order_items" 
        ADD CONSTRAINT "supplier_purchase_order_items_po_id_supplier_purchase_orders_id_fk" 
        FOREIGN KEY ("po_id") REFERENCES "supplier_purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
      `);
      console.log("   ✅ Foreign key constraint with cascade delete created successfully.");
    } catch (e: any) {
      if (e.message && e.message.includes("already exists")) {
        console.log("   ℹ️ Foreign key constraint already exists.");
      } else {
        throw e;
      }
    }

    console.log("\n✅ Custom database migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
