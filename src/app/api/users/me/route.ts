import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        profilePic: users.profilePic,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan!" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { fullName, profilePic, oldPassword, newPassword } = body;

    // Ambil data user saat ini (untuk cek password lama)
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan!" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (profilePic !== undefined) updateData.profilePic = profilePic;

    // Jika user berniat mengubah password pribadi
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: "Password lama wajib diisi untuk verifikasi keamanan!" }, { status: 400 });
      }

      // Bandingkan password lama
      const isPasswordValid = await bcrypt.compare(oldPassword, currentUser.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Password lama Anda salah!" }, { status: 400 });
      }

      // Hash password baru
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.userId))
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
