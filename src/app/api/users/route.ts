import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Helper check management authorization (admin, manager, assistant_manager)
function isAuthorized(role: string) {
  return role === "admin" || role === "manager" || role === "assistant_manager";
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAuthorized(session.role)) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  try {
    const allUsers = await db
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
      .orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAuthorized(session.role)) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, password, fullName, role } = body;

    if (!username || !password || !fullName || !role) {
      return NextResponse.json({ error: "Semua kolom input wajib diisi!" }, { status: 400 });
    }

    // Cek apakah username sudah terdaftar
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase().trim()))
      .limit(1);

    if (existingUser) {
      return NextResponse.json({ error: "Username sudah terdaftar! Gunakan username lain." }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Simpan ke database
    const [newUser] = await db
      .insert(users)
      .values({
        username: username.toLowerCase().trim(),
        passwordHash,
        fullName,
        role,
        isActive: true,
      })
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
