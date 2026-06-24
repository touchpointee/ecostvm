import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { getJids, parseGroupJids } from "@/lib/jids";
import { getConnectionStatus, sendComposing, sendToGroupWithRetry } from "@/lib/whatsapp";

const HEADER = "🚗 *ECOSTVM - Service Booking Request*";
const PUBLIC_FEEDBACK_BASE = process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";
const PUBLIC_SERVICE_BASE = PUBLIC_FEEDBACK_BASE.endsWith("/feedback")
  ? PUBLIC_FEEDBACK_BASE.slice(0, -9) + "/service"
  : PUBLIC_FEEDBACK_BASE + "/service";

function formatMessage(
  serviceId: string,
  details: {
    name?: string;
    contactNumber?: string;
    vehicleNumber?: string;
    appointmentDate?: string;
    odometer?: number;
    types?: string[];
    remarks?: string;
    trackingCode?: string;
  }
): string {
  const url = details.trackingCode
    ? `${PUBLIC_SERVICE_BASE}/${serviceId}?token=${details.trackingCode}`
    : `${PUBLIC_SERVICE_BASE}/${serviceId}`;
  const lines = [
    HEADER,
    "",
    details.name ? `Name: ${details.name}` : undefined,
    details.contactNumber ? `Contact: ${details.contactNumber}` : undefined,
    details.vehicleNumber ? `Vehicle: ${details.vehicleNumber}` : undefined,
    details.appointmentDate ? `Preferred Date: ${details.appointmentDate}` : undefined,
    details.odometer != null ? `Odometer Reading: ${details.odometer} KMs` : undefined,
    details.types && details.types.length > 0 ? `Type of Service: ${details.types.join(", ")}` : undefined,
    details.remarks ? `Remarks/Concerns: ${details.remarks}` : undefined,
    "",
    `View full request: ${url}`,
  ].filter((line) => line !== undefined) as string[];
  return lines.join("\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Protect admin routes with dedicated admin cookie
  const adminCookie = request.cookies.get("ecostvm_admin")?.value;
  if (adminCookie !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check WhatsApp connection status before attempting to send
    const status = getConnectionStatus();
    if (status !== "connected") {
      return NextResponse.json(
        { success: false, error: "WhatsApp is not connected. Please connect WhatsApp from the admin dashboard first." },
        { status: 503 }
      );
    }

    const db = await getDb();
    const _id = new ObjectId(id);
    const service = await db.collection("services").findOne({ _id });
    if (!service) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    const jids = await getJids();
    const groupJids = parseGroupJids(jids.serviceGroupJid || jids.registrationGroupJid);

    if (groupJids.length === 0) {
      await db.collection("services").updateOne(
        { _id },
        {
          $set: {
            whatsappSent: false,
            whatsappError: "No group JID configured",
          },
          $inc: { attempts: 1 },
        }
      );
      return NextResponse.json({
        success: false,
        error: "No group JID configured",
      });
    }

    const text = formatMessage(id, {
      name: service.name,
      contactNumber: service.contactNumber,
      vehicleNumber: service.vehicleNumber,
      appointmentDate: service.appointmentDate,
      odometer: service.odometer,
      types: service.types,
      remarks: service.remarks,
      trackingCode: service.trackingCode,
    });
    let whatsappSent = false;
    let whatsappError: string | null = null;

    try {
      for (const groupJid of groupJids) {
        await sendComposing(groupJid, 3000);
        await sendToGroupWithRetry(groupJid, text);
      }
      whatsappSent = true;
    } catch (err) {
      console.error("[api/service/:id/retry] WhatsApp send failed", err);
      whatsappError =
        err instanceof Error ? err.message : "Failed to send WhatsApp notification";
    }

    await db.collection("services").updateOne(
      { _id },
      {
        $set: {
          whatsappSent,
          whatsappError,
        },
        $inc: { attempts: 1 },
      }
    );

    return NextResponse.json({ success: whatsappSent, error: whatsappError });
  } catch (e) {
    console.error("[api/service/:id/retry]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Retry failed" },
      { status: 500 }
    );
  }
}
