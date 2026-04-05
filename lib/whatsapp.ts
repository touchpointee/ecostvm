/**
 * WhatsApp client – powered by @whiskeysockets/baileys.
 *
 * Exported API surface is identical to the previous whatsapp-web.js
 * implementation so all callers (birthdays.ts, retryScheduler.ts,
 * API routes) continue to work with zero changes.
 *
 * ─── How to find your Group JID ────────────────────────────────────────────
 * 1. Ensure WhatsApp is connected (status === 'connected').
 * 2. Call  POST /api/whatsapp/groups  — returns [{ id, subject }].
 * 3. The  id  field (e.g. "120363XXXXXX@g.us") is your groupId.
 *
 * Alternatively, from a one-off Node script:
 *   const groups = await sock.groupFetchAllParticipating()
 *   console.log(Object.entries(groups).map(([id, g]) => ({ id, subject: g.subject })))
 * ───────────────────────────────────────────────────────────────────────────
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { access, mkdir, readFile, rm } from "fs/promises";
import path from "path";
import { saveStoredQR } from "./whatsappQRStore";

// Persistent session folder – mount as a volume in Coolify so the session
// survives container redeploys and prevents constant QR re-scans.
const AUTH_FOLDER = path.join(process.cwd(), "auth_session");

// Keep Coolify logs clean; Baileys internal noise is suppressed at 'error'.
const logger = pino({ level: "error" });

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "close";
type WASocket = ReturnType<typeof makeWASocket>;

// ─── Global state (survives Next.js HMR hot-reloads in dev) ──────────────────
declare global {
  // eslint-disable-next-line no-var
  var _wwjs:
    | {
        sock: WASocket | null;
        currentQR: string | null;
        connectionStatus: ConnectionStatus;
        connectPromise: Promise<WASocket> | null;
        readyPromise: Promise<WASocket> | null;
        readyResolve: ((sock: WASocket) => void) | null;
        lastInitError: string | null;
        loggedOut: boolean;
      }
    | undefined;
}

if (!global._wwjs) {
  global._wwjs = {
    sock: null,
    currentQR: null,
    connectionStatus: "disconnected",
    connectPromise: null,
    readyPromise: null,
    readyResolve: null,
    lastInitError: null,
    loggedOut: false,
  };
}

const G = global._wwjs!;

// ─── Public read accessors ────────────────────────────────────────────────────
export function getConnectionStatus(): ConnectionStatus {
  return G.connectionStatus;
}
export function getLastInitError(): string | null {
  return G.lastInitError;
}
export function getCurrentQR(): string | null {
  return G.currentQR;
}
export function getSocket(): WASocket | null {
  return G.sock;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  const prev = G.sock;
  G.sock = null;
  G.connectPromise = null;
  G.readyPromise = null;
  G.readyResolve = null;
  G.connectionStatus = "disconnected";
  G.currentQR = null;
  G.lastInitError = null;
  G.loggedOut = true;
  await saveStoredQR(null);
  try {
    if (prev) {
      try {
        await prev.logout();
      } catch {}
    }
    await rm(AUTH_FOLDER, { recursive: true, force: true });
  } catch (e) {
    console.error("[whatsapp] logout cleanup failed", e);
  }
}

export function clearSocketIfClosed(): void {
  G.sock = null;
  G.connectPromise = null;
  G.readyPromise = null;
  G.readyResolve = null;
  G.connectionStatus = "disconnected";
  G.currentQR = null;
  void saveStoredQR(null);
}

// ─── Anti-ban randomized delay (8–18 s) ──────────────────────────────────────
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Create & wire up a new Baileys socket ───────────────────────────────────
async function createSocket(): Promise<WASocket> {
  await mkdir(AUTH_FOLDER, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  let version: [number, number, number] | undefined;
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
  } catch {
    // Fall back to Baileys bundled default WA version.
  }

  // Custom browser string reduces ban risk on virtual / shared numbers.
  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: ["EcoSport TVM Portal", "Chrome", "1.0.0"],
    // printQRInTerminal handled by Baileys internally (uses qrcode-terminal dep).
    printQRInTerminal: true,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      G.currentQR = qr;
      G.connectionStatus = "connecting";
      G.lastInitError = null;
      await saveStoredQR(qr);
    }

    if (connection === "open") {
      G.connectionStatus = "connected";
      G.currentQR = null;
      G.lastInitError = null;
      G.loggedOut = false;
      await saveStoredQR(null);
      console.log("[whatsapp] connected");
      if (G.readyResolve) {
        G.readyResolve(sock);
        G.readyResolve = null;
      }
    }

    if (connection === "close") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const wasLoggedOut = statusCode === DisconnectReason.loggedOut;

      G.connectionStatus = "disconnected";
      G.currentQR = null;
      G.connectPromise = null;
      G.readyPromise = null;
      G.readyResolve = null;
      G.sock = null;
      await saveStoredQR(null);

      if (wasLoggedOut || G.loggedOut) {
        console.log("[whatsapp] logged out – clearing session files");
        G.loggedOut = true;
        try {
          await rm(AUTH_FOLDER, { recursive: true, force: true });
        } catch {}
        return;
      }

      console.log(`[whatsapp] closed (code ${statusCode}), reconnecting in 5 s…`);
      setTimeout(() => {
        connect().catch((e) =>
          console.error("[whatsapp] auto-reconnect failed", e)
        );
      }, 5000);
    }
  });

  return sock;
}

// ─── Connect ──────────────────────────────────────────────────────────────────
export async function connect(): Promise<WASocket> {
  if (G.sock && G.connectionStatus === "connected") return G.sock;
  if (G.connectPromise) return G.connectPromise;

  G.loggedOut = false;
  G.lastInitError = null;
  G.connectionStatus = "connecting";
  G.currentQR = null;
  await saveStoredQR(null);

  G.readyPromise = new Promise<WASocket>((resolve) => {
    G.readyResolve = resolve;
  });

  G.connectPromise = (async () => {
    const sock = await createSocket();
    G.sock = sock;
    return sock;
  })();

  try {
    const sock = await G.connectPromise;
    console.log("[whatsapp] socket created – waiting for QR or open");
    return sock;
  } catch (e) {
    G.connectPromise = null;
    G.readyPromise = null;
    G.readyResolve = null;
    G.connectionStatus = "disconnected";
    G.lastInitError = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp] connect failed", e);
    throw e;
  }
}

// ─── Internal helper ─────────────────────────────────────────────────────────
async function getSocketWhenReady(): Promise<WASocket> {
  if (G.connectionStatus === "connected" && G.sock) return G.sock;
  if (G.readyPromise) return G.readyPromise;
  throw new Error(
    "WhatsApp not connected. Please click Connect WhatsApp in the admin dashboard."
  );
}

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  return (
    lower.includes("connection closed") ||
    lower.includes("socket closed") ||
    lower.includes("econnreset") ||
    lower.includes("econnrefused") ||
    lower.includes("not connected") ||
    lower.includes("detached frame") ||
    lower.includes("detached") ||
    lower.includes("target closed") ||
    lower.includes("session closed") ||
    lower.includes("protocol error")
  );
}

// ─── Text messaging ───────────────────────────────────────────────────────────
export async function sendToGroup(
  groupJid: string,
  text: string
): Promise<void> {
  const sock = await getSocketWhenReady();
  await sock.sendMessage(groupJid, { text });
}

export async function sendToGroupWithRetry(
  groupJid: string,
  text: string
): Promise<void> {
  try {
    await sendToGroup(groupJid, text);
  } catch (e) {
    if (isConnectionError(e)) {
      console.warn(
        "[whatsapp] send failed (connection error), retrying once:",
        e
      );
      clearSocketIfClosed();
      await connect();
      const sock = await getSocketWhenReady();
      await sock.sendMessage(groupJid, { text });
    } else {
      throw e;
    }
  }
}

// ─── Image messaging ──────────────────────────────────────────────────────────
export async function sendImageToGroupWithRetry(
  groupJid: string,
  image: Buffer,
  _filename: string,
  caption?: string
): Promise<string | undefined> {
  const safeCaption = caption?.trim() ?? "";

  const doSend = async (sock: WASocket) =>
    sock.sendMessage(groupJid, { image, caption: safeCaption });

  try {
    const msg = await doSend(await getSocketWhenReady());
    return msg?.key?.id ?? undefined;
  } catch (e) {
    if (isConnectionError(e)) {
      console.warn(
        "[whatsapp] image send failed (connection error), retrying once:",
        e
      );
      clearSocketIfClosed();
      await connect();
      const msg = await doSend(await getSocketWhenReady());
      return msg?.key?.id ?? undefined;
    } else {
      throw e;
    }
  }
}

// ─── Presence / typing indicator ─────────────────────────────────────────────
export async function sendComposing(
  groupJid: string,
  durationMs: number
): Promise<void> {
  try {
    const sock = await getSocketWhenReady();
    await sock.sendPresenceUpdate("composing", groupJid);
    await new Promise((r) => setTimeout(r, durationMs));
    await sock.sendPresenceUpdate("paused", groupJid);
  } catch {
    // typing indicator is best-effort
  }
}

// ─── Group listing ────────────────────────────────────────────────────────────
export async function fetchAllGroups(): Promise<
  { id: string; subject?: string }[]
> {
  const sock = await getSocketWhenReady();
  const groups = await sock.groupFetchAllParticipating();
  return Object.entries(groups).map(([id, g]) => ({ id, subject: g.subject }));
}

// ─── Direct (1-to-1) messaging ───────────────────────────────────────────────
// Converts an Indian phone number to a Baileys individual JID.
// 10-digit numbers get country code 91 prepended automatically.
function phoneToJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}@s.whatsapp.net`;
  return `${digits}@s.whatsapp.net`;
}

export async function sendDirectMessage(
  phone: string,
  text: string
): Promise<void> {
  const jid = phoneToJid(phone);
  const sock = await getSocketWhenReady();
  await sock.sendMessage(jid, { text });
}

export async function sendDirectMessageWithRetry(
  phone: string,
  text: string
): Promise<void> {
  try {
    await sendDirectMessage(phone, text);
  } catch (e) {
    if (isConnectionError(e)) {
      console.warn(
        "[whatsapp] direct send failed (connection error), retrying once:",
        e
      );
      clearSocketIfClosed();
      await connect();
      const sock = await getSocketWhenReady();
      await sock.sendMessage(phoneToJid(phone), { text });
    } else {
      throw e;
    }
  }
}

// ─── sendEcoSportUpdate ───────────────────────────────────────────────────────
// High-level helper used to post EcoSport TVM updates to a WhatsApp group.
// Accepts a local file path or an https:// URL as imagePath.
// A random 8–18 s delay is applied before every send to stay under
// WhatsApp's spam-detection thresholds on virtual numbers.
export async function sendEcoSportUpdate(
  groupId: string,
  imagePath: string,
  caption: string
): Promise<void> {
  await randomDelay(8000, 18000);

  let imagePayload: Buffer | { url: string };

  if (imagePath.startsWith("https://") || imagePath.startsWith("http://")) {
    imagePayload = { url: imagePath };
  } else {
    try {
      await access(imagePath);
    } catch {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    imagePayload = await readFile(imagePath);
  }

  const doSend = async (sock: WASocket) =>
    sock.sendMessage(groupId, {
      image: imagePayload as Buffer,
      caption,
    });

  try {
    await doSend(await getSocketWhenReady());
  } catch (e) {
    if (isConnectionError(e)) {
      clearSocketIfClosed();
      await connect();
      await doSend(await getSocketWhenReady());
    } else {
      throw e;
    }
  }
}
