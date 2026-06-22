import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fgItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json(); // expected: { status: 'GOOD' | 'REJECT', defectReason?: string }

  if (!body.status || !["GOOD", "REJECT"].includes(body.status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  try {
    const [updatedItem] = await db
      .update(fgItems)
      .set({ 
        status: body.status, 
        defectReason: body.status === "REJECT" ? (body.defectReason || "Cacat produksi") : null 
      })
      .where(eq(fgItems.id, id))
      .returning();

    return NextResponse.json(updatedItem);
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memperbarui status item", details: err.message }, { status: 500 });
  }
}
