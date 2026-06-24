import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function resolveId(context: RouteContext): Promise<string | null> {
  const params = await Promise.resolve(context.params);
  const id = String(params.id ?? "").trim();
  return ObjectId.isValid(id) ? id : null;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    const adminCookie = request.cookies.get("ecostvm_admin")?.value;
    const isAdmin = adminCookie === "1";

    const db = await getDb();
    const doc = await db
      .collection("services")
      .findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    // Access control: must be admin OR token must match trackingCode
    const isAuthorized = isAdmin || (token && token === String(doc.trackingCode ?? ""));
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      item: {
        id: String(doc._id),
        name: doc.name ?? "",
        contactNumber: doc.contactNumber ?? "",
        vehicleNumber: doc.vehicleNumber ?? "",
        appointmentDate: doc.appointmentDate ?? "",
        odometer: doc.odometer ?? 0,
        types: doc.types ?? [],
        remarks: doc.remarks ?? "",
        trackingCode: doc.trackingCode ?? "",
        createdAt: doc.createdAt ?? null,
        whatsappSent: doc.whatsappSent ?? false,
        whatsappError: doc.whatsappError ?? null,
        customerWhatsappSent: doc.customerWhatsappSent ?? false,
        customerWhatsappError: doc.customerWhatsappError ?? null,
      },
    });
  } catch (e) {
    console.error("[api/service/:id GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load service booking" },
      { status: 500 }
    );
  }
}

// ─── DELETE (admin only) ───────────────────────────────────────────────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const adminCookie = request.cookies.get("ecostvm_admin")?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("services").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/service/:id DELETE]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete service booking" },
      { status: 500 }
    );
  }
}
