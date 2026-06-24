import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMemberByPhoneNumber } from "@/lib/members";
import { getDb } from "@/lib/mongo";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const phone = session.phoneNumber.replace(/\D/g, "").trim();
    
    // Find member profile to get vehicle number for robust matching
    const member = await getMemberByPhoneNumber(session.phoneNumber);

    const query: any = {
      $or: [
        { contactNumber: phone },
        { contactNumber: session.phoneNumber },
      ],
    };

    if (member) {
      if (member.contactNumber) {
        const cleanMemberPhone = member.contactNumber.replace(/\D/g, "").trim();
        query.$or.push({ contactNumber: cleanMemberPhone });
      }
      if (member.vehicleNumber) {
        query.$or.push({ vehicleNumber: member.vehicleNumber.toUpperCase() });
      }
    }

    const services = await db
      .collection("services")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const items = services.map((doc) => ({
      id: String(doc._id),
      name: doc.name ?? "",
      contactNumber: doc.contactNumber ?? "",
      vehicleNumber: doc.vehicleNumber ?? "",
      appointmentDate: doc.appointmentDate ?? "",
      odometer: doc.odometer ?? 0,
      types: doc.types ?? [],
      remarks: doc.remarks ?? "",
      createdAt: doc.createdAt ?? null,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/service/member]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load member service requests" },
      { status: 500 }
    );
  }
}
