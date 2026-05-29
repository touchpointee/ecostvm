import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

const ADMIN_COOKIE = "ecostvm_admin";

type WhatsAppLogDoc = {
  timestamp?: Date | string;
  type?: string;
  action?: string;
  ip?: string;
  userAgent?: string;
  adminAuthorized?: boolean;
  statusCode?: number;
  reason?: string;
  location?: unknown;
};

function requireAdmin(request: NextRequest): NextResponse | null {
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 50;
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;

    const db = await getDb();
    const docs = await db
      .collection<WhatsAppLogDoc>("whatsapp_logs")
      .find({})
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit)
      .toArray();

    const logs = docs.map((doc) => ({
      id: doc._id.toString(),
      timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : null,
      type: doc.type ?? "",
      action: doc.action ?? "",
      ip: doc.ip ?? "",
      userAgent: doc.userAgent ?? "",
      adminAuthorized: doc.adminAuthorized ?? null,
      statusCode: doc.statusCode ?? null,
      reason: doc.reason ?? "",
      location: doc.location ?? null,
    }));

    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load WhatsApp logs" },
      { status: 500 }
    );
  }
}
