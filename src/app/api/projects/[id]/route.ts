import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status !== undefined)           updateData.status = body.status;
    if (body.projectName !== undefined)      updateData.projectName = body.projectName;
    if (body.customerName !== undefined)     updateData.customerName = body.customerName;
    if (body.picName !== undefined)          updateData.picName = body.picName;
    if (body.projectValue !== undefined)     updateData.projectValue = body.projectValue ? String(body.projectValue) : null;
    if (body.tenderDate !== undefined)       updateData.tenderDate = body.tenderDate || null;
    if (body.estimatedFinish !== undefined)  updateData.estimatedFinish = body.estimatedFinish || null;
    if (body.location !== undefined)         updateData.location = body.location || null;
    if (body.notes !== undefined)            updateData.notes = body.notes || null;

    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal update proyek" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal hapus proyek" }, { status: 500 });
  }
}
