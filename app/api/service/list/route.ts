import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { Filter, ObjectId } from "mongodb";
import { createServicesWorkbook } from "@/lib/xlsx";

type ServiceDoc = {
  _id: ObjectId;
  name?: string;
  contactNumber?: string;
  vehicleNumber?: string;
  appointmentDate?: string;
  odometer?: number;
  types?: string[];
  remarks?: string;
  trackingCode?: string;
  createdAt?: Date | null;
  whatsappSent?: boolean;
  whatsappError?: string | null;
  attempts?: number;
  customerWhatsappSent?: boolean;
  customerWhatsappError?: string | null;
  customerWhatsappAttempts?: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBooleanFilter(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "sent", "1"].includes(normalized)) return true;
  if (["false", "no", "pending", "not sent", "0"].includes(normalized)) return false;
  return null;
}

export async function GET(request: NextRequest) {
  // Protect admin routes with dedicated admin cookie
  const adminCookie = request.cookies.get("ecostvm_admin")?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "").trim().toLowerCase();
    const limitParam = Number(searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 1000)
      : 200;
    const name = searchParams.get("name")?.trim() ?? "";
    const contactNumber = searchParams.get("contactNumber")?.trim() ?? "";
    const vehicleNumber = searchParams.get("vehicleNumber")?.trim() ?? "";
    const appointmentDate = searchParams.get("appointmentDate")?.trim() ?? "";
    const serviceType = searchParams.get("serviceType")?.trim() ?? "";
    const whatsappSent = searchParams.get("whatsappSent")?.trim() ?? "";
    const customerWhatsappSent = searchParams.get("customerWhatsappSent")?.trim() ?? "";

    const query: Filter<ServiceDoc> = {};
    const andFilters: Filter<ServiceDoc>[] = [];

    if (name) {
      andFilters.push({ name: { $regex: escapeRegex(name), $options: "i" } });
    }
    if (contactNumber) {
      andFilters.push({
        contactNumber: { $regex: escapeRegex(contactNumber), $options: "i" },
      });
    }
    if (vehicleNumber) {
      andFilters.push({
        vehicleNumber: { $regex: escapeRegex(vehicleNumber), $options: "i" },
      });
    }
    if (appointmentDate) {
      andFilters.push({
        appointmentDate: { $regex: escapeRegex(appointmentDate), $options: "i" },
      });
    }
    if (serviceType) {
      andFilters.push({
        types: { $elemMatch: { $regex: escapeRegex(serviceType), $options: "i" } } as any,
      });
    }
    const whatsappSentBool = parseBooleanFilter(whatsappSent);
    if (whatsappSentBool !== null) {
      andFilters.push({ whatsappSent: whatsappSentBool });
    }
    const customerWhatsappSentBool = parseBooleanFilter(customerWhatsappSent);
    if (customerWhatsappSentBool !== null) {
      andFilters.push({ customerWhatsappSent: customerWhatsappSentBool });
    }

    if (andFilters.length === 1) {
      Object.assign(query, andFilters[0]);
    } else if (andFilters.length > 1) {
      query.$and = andFilters;
    }

    const db = await getDb();
    const items = await db
      .collection<ServiceDoc>("services")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const results = items.map((doc) => ({
      id: (doc._id as ObjectId).toString(),
      name: doc.name ?? "",
      contactNumber: doc.contactNumber ?? "",
      vehicleNumber: doc.vehicleNumber ?? "",
      appointmentDate: doc.appointmentDate ?? "",
      odometer: doc.odometer ?? 0,
      advisor: (doc as any).advisor ?? "",
      types: doc.types ?? [],
      remarks: doc.remarks ?? "",
      trackingCode: doc.trackingCode ?? "",
      createdAt: doc.createdAt ?? null,
      whatsappSent: doc.whatsappSent ?? false,
      whatsappError: doc.whatsappError ?? null,
      attempts: doc.attempts ?? 0,
      customerWhatsappSent: doc.customerWhatsappSent ?? false,
      customerWhatsappError: doc.customerWhatsappError ?? null,
    }));

    if (format === "xlsx") {
      const workbook = createServicesWorkbook(
        items.map((doc) => ({
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
          name: doc.name ?? "",
          contactNumber: doc.contactNumber ?? "",
          vehicleNumber: doc.vehicleNumber ?? "",
          appointmentDate: doc.appointmentDate ?? "",
          odometer: doc.odometer != null ? String(doc.odometer) : "",
          advisor: (doc as any).advisor ?? "",
          types: doc.types ? doc.types.join(", ") : "",
          remarks: doc.remarks ?? "",
          whatsappSent: doc.whatsappSent ? "Yes" : "No",
          whatsappError: doc.whatsappError ?? "",
          customerWhatsappSent: doc.customerWhatsappSent ? "Yes" : "No",
          customerWhatsappError: doc.customerWhatsappError ?? "",
        }))
      );

      const stamp = new Date().toISOString().slice(0, 10);
      const binary = new Uint8Array(workbook);
      return new NextResponse(binary, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="services-report-${stamp}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ items: results });
  } catch (e) {
    console.error("[api/service/list]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to load services list",
      },
      { status: 500 }
    );
  }
}
