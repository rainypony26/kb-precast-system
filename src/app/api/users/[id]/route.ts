import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function isAuthorized(role: string) {
  return role === "admin" || role === "manager" || role === "assistant_manager";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAuthorized(session.role)) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { fullName, role, isActive, password } = body;

    // Pastikan user target ada
    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan!" }, { status: 404 });
    }

    // Hindari menonaktifkan akun sendiri
    if (id === session.userId && isActive === false) {
      return NextResponse.json({ error: "Anda tidak dapat menonaktifkan akun Anda sendiri!" }, { status: 400 });
    }

    // Hindari mendowngrade role sendiri
    if (id === session.userId && role && role !== targetUser.role) {
      return NextResponse.json({ error: "Anda tidak dapat mengubah jabatan akun Anda sendiri!" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Jika ganti/reset password dikirim oleh admin/manager
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        profilePic: users.profilePic,
        createdAt: users.createdAt,
      });

    return NextResponse.json(updatedUser);
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
  if (!isAuthorized(session.role)) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri!" }, { status: 400 });
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan!" }, { status: 404 });
    }

    // Coba delete secara fisik
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true, message: "Pengguna berhasil dihapus secara permanen!" });
  } catch (err: any) {
    // Tangani error relasi foreign key
    if (err.message && (err.message.includes("foreign key") || err.message.includes("violates foreign key"))) {
      return NextResponse.json({
        error: "Tidak dapat menghapus user karena sudah memiliki log transaksi/aktivitas terdaftar. Silakan gunakan opsi 'Suspend' (Nonaktifkan) untuk memblokir akses akun."
      }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
