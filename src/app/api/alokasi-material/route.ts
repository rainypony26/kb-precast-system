export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materials, materialOutbound, projects, contracts, rabs, bomMaterials } from "@/db/schema";
import { eq, sql, isNotNull, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select({
        id: materialOutbound.id,
        materialId: materialOutbound.materialId,
        materialName: materials.name,
        unit: materials.unit,
        qty: materialOutbound.qty,
        unitPrice: materialOutbound.unitPrice,
        projectId: materialOutbound.projectId,
        projectName: projects.projectName,
        exitDate: materialOutbound.exitDate,
        notes: materialOutbound.notes,
        createdAt: materialOutbound.createdAt,
      })
      .from(materialOutbound)
      .leftJoin(materials, eq(materialOutbound.materialId, materials.id))
      .leftJoin(projects, eq(materialOutbound.projectId, projects.id))
      .where(isNotNull(materialOutbound.projectId))
      .orderBy(desc(materialOutbound.createdAt));

    return NextResponse.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/alokasi-material]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { projectId, items, notes } = body as {
      projectId: string;
      items: { materialId: string; qty: string; unitPrice: string }[];
      notes?: string;
    };

    if (!projectId || !items || items.length === 0) {
      return NextResponse.json({ error: "Proyek dan minimal 1 material harus diisi!" }, { status: 400 });
    }

    // Fetch project name for recipient field
    const [project] = await db
      .select({ projectName: projects.projectName })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Proyek tidak ditemukan!" }, { status: 404 });
    }

    const created: string[] = [];

    // Find contract and RAB for this project to auto-insert into BOM
    const [contract] = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.projectId, projectId));

    let rabId: string | null = null;
    if (contract) {
      const [rab] = await db
        .select({ id: rabs.id })
        .from(rabs)
        .where(eq(rabs.contractId, contract.id))
        .orderBy(desc(rabs.createdAt))
        .limit(1);
      if (rab) rabId = rab.id;
    }

    for (const item of items) {
      // Validate material
      const [mat] = await db.select().from(materials).where(eq(materials.id, item.materialId));
      if (!mat) {
        return NextResponse.json({ error: `Material tidak ditemukan!` }, { status: 404 });
      }

      const currentStock = parseFloat(mat.stock || "0");
      const reqQty = parseFloat(item.qty);

      if (reqQty <= 0) {
        return NextResponse.json({ error: `Qty harus lebih dari 0 untuk ${mat.name}` }, { status: 400 });
      }
      if (currentStock < reqQty) {
        return NextResponse.json({ error: `Stok ${mat.name} tidak cukup! (tersedia: ${currentStock} ${mat.unit})` }, { status: 400 });
      }

      const unitPriceVal = parseFloat(item.unitPrice);
      if (isNaN(unitPriceVal) || unitPriceVal < 0) {
        return NextResponse.json({ error: `Harga satuan ${mat.name} tidak valid!` }, { status: 400 });
      }

      // Insert outbound record
      const [inserted] = await db
        .insert(materialOutbound)
        .values({
          materialId: item.materialId,
          recipient: project.projectName,
          qty: reqQty.toString(),
          exitDate: new Date(),
          projectId,
          unitPrice: unitPriceVal.toString(),
          notes: notes || null,
        })
        .returning({ id: materialOutbound.id });

      created.push(inserted.id);

      // Deduct stock
      const newStock = currentStock - reqQty;
      await db.update(materials).set({ stock: newStock.toFixed(3) }).where(eq(materials.id, item.materialId));

      // Also insert into BOM RAB if project has an approved RAB
      if (rabId) {
        await db.insert(bomMaterials).values({
          rabId,
          materialId: item.materialId,
          materialName: mat.name,
          estimatedQty: reqQty.toString(),
          unit: mat.unit,
          procurementType: "BELI_BARU",
          unitPrice: unitPriceVal.toString(),
          notes: `Auto dari alokasi material${notes ? `: ${notes}` : ""}`,
        });
      }
    }

    return NextResponse.json({ success: true, ids: created, bomUpdated: !!rabId, rabId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/alokasi-material]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
