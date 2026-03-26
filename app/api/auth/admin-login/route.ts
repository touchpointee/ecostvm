import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

const ADMIN_COOKIE = "ecostvm_admin";
const ADMIN_COLLECTION = "admin_logins";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = body?.number ?? body?.phoneNumber ?? "";
    const digits = String(raw).replace(/\D/g, "").trim();

    if (!digits) {
      return NextResponse.json(
        { error: "Enter admin phone number." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const coll = db.collection<{ phoneNumber: string }>(ADMIN_COLLECTION);

    const existingCount = await coll.countDocuments({});

    // If no admin exists yet, first successful login number becomes admin.
    if (existingCount === 0) {
      await coll.insertOne({ phoneNumber: digits });
    } else {
      const admin = await coll.findOne({ phoneNumber: digits });
      if (!admin) {
        return NextResponse.json(
          { error: "Invalid admin number." },
          { status: 401 }
        );
      }
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, "1", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[api/auth/admin-login]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin login failed" },
      { status: 500 }
    );
  }
}

