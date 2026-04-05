import { NextRequest, NextResponse } from "next/server";
import {
  getAdminUsername,
  verifyAdminPassword,
  updateAdminUsername,
  updateAdminPassword,
  getWelcomeTemplate,
  updateWelcomeTemplate,
} from "@/lib/settings";

const ADMIN_COOKIE = "ecostvm_admin";

function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE);
  if (!cookie || cookie.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const [username, welcomeTemplate] = await Promise.all([
    getAdminUsername(),
    getWelcomeTemplate(),
  ]);
  return NextResponse.json({ username, welcomeTemplate });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const action = String(body?.action ?? "").trim();
    const currentPassword = String(body?.currentPassword ?? "").trim();

    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }

    const passwordValid = await verifyAdminPassword(currentPassword);
    if (!passwordValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    if (action === "change_username") {
      const newUsername = String(body?.newUsername ?? "").trim();
      if (!newUsername || newUsername.length < 3) {
        return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
      }
      await updateAdminUsername(newUsername);
      return NextResponse.json({ success: true, message: "Username updated successfully." });
    }

    if (action === "change_password") {
      const newPassword = String(body?.newPassword ?? "").trim();
      const confirmPassword = String(body?.confirmPassword ?? "").trim();
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
      }
      await updateAdminPassword(newPassword);
      return NextResponse.json({ success: true, message: "Password updated successfully." });
    }

    if (action === "update_welcome_template") {
      const template = String(body?.template ?? "");
      if (!template.trim()) {
        return NextResponse.json({ error: "Template cannot be empty." }, { status: 400 });
      }
      await updateWelcomeTemplate(template);
      return NextResponse.json({ success: true, message: "Welcome message template saved." });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    console.error("[api/admin/settings]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
