import { NextRequest, NextResponse } from "next/server";
import { createPendingRegistration } from "@/lib/registrations";
import { getDb } from "@/lib/mongo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields: Array<[string, string]> = [
      ["name", "Name"],
      ["contactNumber", "Contact No"],
      ["vehicleNumber", "Vehicle No"],
      ["place", "Place"],
      ["address", "Address"],
      ["dateOfBirth", "Date of Birth"],
    ];
    for (const [field, label] of requiredFields) {
      if (!body[field] || String(body[field]).trim() === "") {
        return NextResponse.json({ error: `${label} is required.` }, { status: 400 });
      }
    }

    if (!/^[a-zA-Z ]+$/.test(String(body.name ?? ""))) {
      return NextResponse.json({ error: "Name should only contain letters and spaces." }, { status: 400 });
    }
    const rawContact = String(body.contactNumber ?? "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(rawContact)) {
      return NextResponse.json({ error: "Contact number must contain exactly 10 digits." }, { status: 400 });
    }

    // Check if contact number is already registered
    const db = await getDb();
    const existing = await db.collection("logins").findOne({
      $or: [{ phoneNumber: rawContact }, { contactNumber: rawContact }],
    });
    if (existing) {
      return NextResponse.json(
        { error: "This contact number is already registered. Please contact the admin." },
        { status: 409 }
      );
    }

    // Also check if already in pending registrations
    const pending = await db.collection("pending_registrations").findOne({ contactNumber: rawContact });
    if (pending) {
      return NextResponse.json(
        { error: "A registration with this contact number is already pending admin approval." },
        { status: 409 }
      );
    }
    if (!/^([A-Za-z]{2}[ -]?[0-9]{1,2}[ -]?[A-Za-z]{0,2}[ -]?[0-9]{4}|[0-9]{2}[ -]?[Bb][Hh][ -]?[0-9]{4}[ -]?[A-Za-z]{1,2})$/.test(String(body.vehicleNumber ?? ""))) {
      return NextResponse.json({ error: "Invalid vehicle number format (e.g., KL01AB1234 or 21BH1234AA)." }, { status: 400 });
    }

    const result = await createPendingRegistration({
      name: String(body.name ?? "").trim(),
      membershipNumber: String(body.membershipNumber ?? "").trim(),
      contactNumber: rawContact,
      model: String(body.model ?? "").trim(),
      purchaseMonth: String(body.purchaseMonth ?? "").trim(),
      manufacturingYear: String(body.manufacturingYear ?? "").trim(),
      variant: String(body.variant ?? "").trim(),
      vehicleColor: String(body.vehicleColor ?? "").trim(),
      vehicleNumber: String(body.vehicleNumber ?? "").trim().toUpperCase(),
      place: String(body.place ?? "").trim(),
      address: String(body.address ?? "").trim(),
      occupation: String(body.occupation ?? "").trim(),
      mailId: String(body.mailId ?? "").trim(),
      bloodGroup: String(body.bloodGroup ?? "").trim().toUpperCase(),
      dateOfBirth: String(body.dateOfBirth ?? "").trim(),
      emergencyContact: String(body.emergencyContact ?? "").replace(/\D/g, ""),
      suggestions: String(body.suggestions ?? "").trim(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/register POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Registration failed" },
      { status: 500 }
    );
  }
}
