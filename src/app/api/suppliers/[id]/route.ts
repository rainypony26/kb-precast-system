import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const supplier = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);

    if (!supplier.length) {
      return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(supplier[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const current = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (!current.length) {
      return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 });
    }

    const update: Record<string, any> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.address !== undefined) update.address = body.address;
    if (body.category !== undefined) update.category = body.category.toUpperCase();

    const [updatedSupplier] = await db
      .update(suppliers)
      .set(update)
      .where(eq(suppliers.id, id))
      .returning();

    return NextResponse.json(updatedSupplier);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "staff") {
    return NextResponse.json({ error: "Hanya Admin/Manager yang bisa menghapus supplier!" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [deleted] = await db.delete(suppliers).where(eq(suppliers.id, id)).returning();
    if (!deleted) {
      return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Supplier berhasil dihapus!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
