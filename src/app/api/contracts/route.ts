import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, projects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // 1. Validasi data dasar (Tanpa startDate & endDate karena akan ditarik otomatis)
    if (!body.projectId || !body.contractNumber || !body.contractValue) {
      return NextResponse.json({ error: "Data kontrak tidak lengkap!" }, { status: 400 });
    }

    // 2. AMBIL TANGGAL DARI PROYEK (Inheritance Logic)
    const projectData = await db
      .select({
        tenderDate: projects.tenderDate,
        estimatedFinish: projects.estimatedFinish,
      })
      .from(projects)
      .where(eq(projects.id, body.projectId))
      .limit(1);

    if (!projectData.length) {
      return NextResponse.json({ error: "Proyek tidak ditemukan!" }, { status: 404 });
    }

    const { tenderDate, estimatedFinish } = projectData[0];

    // Validasi jika tanggal di proyek ternyata masih kosong
    if (!tenderDate || !estimatedFinish) {
      return NextResponse.json({ 
        error: "Tanggal Proyek belum diatur! Mohon lengkapi tanggal di menu CRM terlebih dahulu." 
      }, { status: 400 });
    }

    // 3. Simpan Kontrak Baru dengan Tanggal Proyek
    const [newContract] = await db
      .insert(contracts)
      .values({
        projectId: body.projectId,
        poId: body.poId || null,
        contractNumber: body.contractNumber,
        contractValue: body.contractValue.toString(),
        
        // OTOMATIS: Menggunakan tanggal dari proyek asal
        startDate: new Date(tenderDate), 
        endDate: new Date(estimatedFinish),
        
        notes: body.notes || null,
      })
      .returning();

    // 4. Update status proyek menjadi 'KONTRAK' secara otomatis
    await db
      .update(projects)
      .set({ status: "KONTRAK" })
      .where(eq(projects.id, body.projectId));

    return NextResponse.json(newContract, { status: 201 });
  } catch (err: any) {
    console.error("API CONTRACT ERROR:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan kontrak" }, { status: 500 });
  }
}