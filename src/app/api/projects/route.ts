import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, sql } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return NextResponse.json(allProjects);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Otomatisasi Project Code
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(projects);
    const count = result[0]?.count || 0;
    const projectCode = `KB-${year}-${String(Number(count) + 1).padStart(4, "0")}`;

    const [newProject] = await db
      .insert(projects)
      .values({
        projectCode,
        projectName: body.projectName,
        customerName: body.customerName,
        picName: body.picName,
        status: body.status ?? "TENDER",
        projectValue: body.projectValue ? String(body.projectValue) : null,
        
        // --- FIX TANGGAL DI SINI ---
        tenderDate: body.tenderDate ? new Date(body.tenderDate) : null,
        estimatedFinish: body.estimatedFinish ? new Date(body.estimatedFinish) : null,
        // ---------------------------

        location: body.location ?? null,
        notes: body.notes ?? null,
        createdBy: session.userId, // Pastikan di lib/auth pakai userId
      })
      .returning();

    return NextResponse.json(newProject, { status: 201 });
  } catch (err: any) {
    console.error("EROR PROJECT POST:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan proyek" }, { status: 500 });
  }
}