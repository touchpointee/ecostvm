import { NextRequest, NextResponse } from "next/server";
import { getJids, parseGroupJids } from "@/lib/jids";
import {
  connect,
  sendComposing,
  sendToGroupWithRetry,
  sendDirectMessageWithRetry,
} from "@/lib/whatsapp";
import { getDb } from "@/lib/mongo";
import { getSession } from "@/lib/auth";
import { startBackgroundJobs } from "@/lib/backgroundJobs";

const HEADER = "🚗 *ECOSTVM - Service Booking Request*";
const PUBLIC_FEEDBACK_BASE = process.env.PUBLIC_FEEDBACK_URL || "https://example.com/feedback";
const PUBLIC_SERVICE_BASE = PUBLIC_FEEDBACK_BASE.endsWith("/feedback")
  ? PUBLIC_FEEDBACK_BASE.slice(0, -9) + "/service"
  : PUBLIC_FEEDBACK_BASE + "/service";

function formatGroupMessage(
  serviceId: string,
  details: {
    name?: string;
    contactNumber?: string;
    vehicleNumber?: string;
    appointmentDate?: string;
    odometer?: number;
    types?: string[];
    remarks?: string;
  }
): string {
  const url = `${PUBLIC_SERVICE_BASE}/${serviceId}`;
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

function formatCustomerMessage(serviceId: string, name: string, trackingCode: string): string {
  const url = `${PUBLIC_SERVICE_BASE}/${serviceId}?token=${trackingCode}`;
  return [
    `🚗 *ECOSTVM – Service Booking Received*`,
    "",
    `Hi ${name}! Thank you for registering your service request.`,
    "",
    `Your reference code: *${trackingCode}*`,
    "",
    `Track your booking details here:`,
    url,
    "",
    `Our team will attend to it shortly. 🙏`,
  ].join("\n");
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, delay));
}

startBackgroundJobs();

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      contactNumber,
      vehicleNumber,
      appointmentDate,
      odometer,
      types,
      remarks,
    } = body;

    if (!name || !vehicleNumber || !appointmentDate || odometer == null || !types || !Array.isArray(types) || types.length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, vehicleNumber, appointmentDate, odometer, types (array).",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Reject blocked members — check by contact number OR vehicle number
    {
      const orClauses: object[] = [];
      if (contactNumber) {
        const phone = String(contactNumber).replace(/\D/g, "").trim();
        if (phone) {
          orClauses.push({ phoneNumber: phone }, { contactNumber: phone });
        }
      }
      if (vehicleNumber) {
        const vn = String(vehicleNumber).trim().toUpperCase();
        if (vn) {
          orClauses.push({ vehicleNumber: vn });
        }
      }
      if (orClauses.length > 0) {
        const restrictedMember = await db.collection("logins").findOne({
          $and: [
            { $or: orClauses },
            { $or: [{ isBlocked: true }, { isSold: true }] },
          ],
        });
        if (restrictedMember) {
          const msg = restrictedMember.isBlocked
            ? "You are not a part of ECOSTVM now."
            : "You have sold your vehicle and cannot register a service request.";
          return NextResponse.json({ error: msg }, { status: 403 });
        }
      }
    }

    const now = new Date();
    const trackingCode = String(Math.floor(10000 + Math.random() * 90000));
    
    const insertResult = await db.collection("services").insertOne({
      name: String(name).trim(),
      contactNumber: contactNumber != null ? String(contactNumber).trim() : undefined,
      vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
      appointmentDate: String(appointmentDate),
      odometer: Number(odometer),
      types: types.map(t => String(t)),
      remarks: remarks != null ? String(remarks).trim() : undefined,
      trackingCode,
      createdAt: now,
      whatsappSent: false,
      whatsappError: null,
      attempts: 0,
      customerWhatsappSent: false,
      customerWhatsappError: null,
      customerWhatsappAttempts: 0,
    });

    const serviceId = String(insertResult.insertedId);

    // ── Send to admin WhatsApp group (best-effort) ──────────────────────────
    const jids = await getJids();
    const groupJids = parseGroupJids(jids.serviceGroupJid || jids.registrationGroupJid); // Fallback to registration group JID if service group JID is not configured

    let whatsappSent = false;
    let whatsappError: string | null = null;

    if (groupJids.length > 0) {
      const text = formatGroupMessage(serviceId, {
        name,
        contactNumber,
        vehicleNumber,
        appointmentDate,
        odometer: Number(odometer),
        types,
        remarks,
      });
      try {
        await connect();
        for (const groupJid of groupJids) {
          await sendComposing(groupJid, 3000);
          await randomDelay(1000, 3000);
          await sendToGroupWithRetry(groupJid, text);
        }
        whatsappSent = true;
      } catch (err) {
        console.error("[api/service] group WhatsApp send failed", err);
        whatsappError =
          err instanceof Error
            ? err.message
            : "Failed to send WhatsApp notification";
      }
    } else {
      whatsappError =
        "No group JID configured. Please set at least one group JID in the Admin portal.";
    }

    // ── Send personal DM to the customer (best-effort) ─────────────────────
    const customerPhone = contactNumber ? String(contactNumber).trim() : "";
    let customerWhatsappSent = false;
    let customerWhatsappError: string | null = null;

    if (customerPhone) {
      const customerText = formatCustomerMessage(
        serviceId,
        String(name).trim(),
        trackingCode
      );
      try {
        await sendDirectMessageWithRetry(customerPhone, customerText);
        customerWhatsappSent = true;
      } catch (err) {
        console.error("[api/service] customer WhatsApp DM failed", err);
        customerWhatsappError =
          err instanceof Error ? err.message : "Failed to send customer DM";
      }
    } else {
      customerWhatsappError = "No contact number provided";
    }

    await db.collection("services").updateOne(
      { _id: insertResult.insertedId },
      {
        $set: {
          whatsappSent,
          whatsappError,
          customerWhatsappSent,
          customerWhatsappError,
        },
        $inc: { attempts: 1, customerWhatsappAttempts: 1 },
      }
    );

    return NextResponse.json({
      success: true,
      id: serviceId,
      trackingCode,
      whatsappSent,
      whatsappError,
      customerWhatsappSent,
      customerWhatsappError,
    });
  } catch (e) {
    console.error("[api/service]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create service booking" },
      { status: 500 }
    );
  }
}
