import { NextResponse } from "next/server";
import { getMemberById } from "@/lib/members";
import { renderMembershipCard } from "@/lib/membershipCard";
import { sendDirectImageWithRetry } from "@/lib/whatsapp";

type RouteContext = {
  params: { id: string };
};

function cardFilename(member: { membershipNumber: string; name: string }) {
  const suffix = member.membershipNumber || member.name || "member";
  return `membership-card-${suffix.replace(/[^\w-]+/g, "-")}.jpg`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const member = await getMemberById(params.id);
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const image = await renderMembershipCard(member.name, member.membershipNumber);

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${cardFilename(member)}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const member = await getMemberById(params.id);
    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const phone = member.contactNumber.replace(/\D/g, "");
    if (phone.length < 10) {
      return NextResponse.json({ error: "Member WhatsApp number is missing or invalid." }, { status: 400 });
    }

    const image = await renderMembershipCard(member.name, member.membershipNumber);
    const messageId = await sendDirectImageWithRetry(
      phone,
      image,
      cardFilename(member),
      `Membership card for ${member.name || "Member"}`
    );

    return NextResponse.json({ ok: true, messageId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send membership card." },
      { status: 500 }
    );
  }
}
