import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rabs, contracts, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { sendTelegramNotification } from "@/lib/telegram";

// Helper formatNumber sederhana untuk use server-side jika diperlukan
function formatNumber(num: number) {
  return new Intl.NumberFormat("id-ID").format(num);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "staff") {
    return NextResponse.json({ error: "Hanya Admin/Manager yang memiliki otoritas menyetujui RAB!" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json(); // expected: { status: 'APPROVED' | 'REJECTED' }

  if (!body.status || !["APPROVED", "REJECTED", "DRAFT"].includes(body.status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  try {
    const [updatedRab] = await db
      .update(rabs)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(rabs.id, id))
      .returning();

    // Jika status disetujui, kirim notifikasi Telegram
    if (body.status === "APPROVED") {
      try {
        const rabDetails = await db
          .select({
            rabNumber: rabs.rabNumber,
            contractValue: contracts.contractValue,
            projectName: projects.projectName,
            projectCode: projects.projectCode,
          })
          .from(rabs)
          .innerJoin(contracts, eq(rabs.contractId, contracts.id))
          .innerJoin(projects, eq(contracts.projectId, projects.id))
          .where(eq(rabs.id, id))
          .limit(1);

        if (rabDetails.length > 0) {
          const detail = rabDetails[0];
          const contractVal = Number(detail.contractValue || 0);
          const message = `📢 <b>RAB Baru Disetujui!</b>\n\n<b>Nomor RAB:</b> <code>${detail.rabNumber}</code>\n<b>Proyek:</b> ${detail.projectName} (${detail.projectCode || "N/A"})\n<b>Nilai Kontrak:</b> Rp ${formatNumber(contractVal)}\n\nSPK siap diterbitkan oleh tim operasional.`;
          await sendTelegramNotification(message);
        }
      } catch (tgErr) {
        console.error("Gagal mengirim Telegram notifikasi:", tgErr);
      }
    }

    return NextResponse.json(updatedRab);
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memperbarui persetujuan RAB", details: err.message }, { status: 500 });
  }
}
