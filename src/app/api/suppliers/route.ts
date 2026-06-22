import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allSuppliers = await db
      .select()
      .from(suppliers)
      .orderBy(desc(suppliers.createdAt));

    return NextResponse.json(allSuppliers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.name || !body.phone || !body.address || !body.category) {
      return NextResponse.json({ error: "Data supplier tidak lengkap!" }, { status: 400 });
    }

    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: body.name,
        phone: body.phone,
        address: body.address,
        category: body.category.toUpperCase(),
      })
      .returning();

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
