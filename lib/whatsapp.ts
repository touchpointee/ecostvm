import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
  type BaileysEventMap,
} from "@whiskeysockets/baileys";
import path from "path";
import { rm } from "fs/promises";
import { saveStoredQR } from "./whatsappQRStore";

const AUTH_DIR = path.join(process.cwd(), ".data", "auth_info_baileys");

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "close";

let sock: WASocket | null = null;
let currentQR: string | null = null;
let connectionStatus: ConnectionStatus = "disconnected";
let connectPromise: Promise<WASocket> | null = null;

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

export function getCurrentQR(): string | null {
  return currentQR;
}

export function getSocket(): WASocket | null {
  return sock;
}

export async function logout(): Promise<void> {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (e) {
    console.error("[whatsapp] logout failed", e);
  } finally {
    sock = null;
    connectPromise = null;
    connectionStatus = "disconnected";
    currentQR = null;
    void saveStoredQR(null);
    // remove stored auth so that the next connect requires a fresh QR
    try {
      await rm(AUTH_DIR, { recursive: true, force: true });
    } catch (e) {
      console.error("[whatsapp] failed to remove auth directory", e);
    }
  }
}

async function createSocket(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    version,
    browser: Browsers.ubuntu("Chrome"),
  });

  socket.ev.on("connection.update", (update: Partial<BaileysEventMap["connection.update"]>) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      currentQR = qr;
      console.log("[whatsapp] QR received");
      void saveStoredQR(qr);
    }
    if (connection === "connecting" || connection === "open") {
      connectionStatus = connection === "open" ? "connected" : "connecting";
      if (connection === "open") {
        currentQR = null;
        void saveStoredQR(null);
      }
    }
    if (connection === "close") {
      connectionStatus = "disconnected";
      currentQR = null;
      void saveStoredQR(null);
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        sock = null;
        connectPromise = null;
        setTimeout(() => connect(), 3000);
      }
    }
  });

  socket.ev.on("creds.update", saveCreds);

  return socket;
}

export async function connect(): Promise<WASocket> {
  if (sock) {
    return sock;
  }
  if (connectPromise) {
    return connectPromise;
  }
  console.log("[whatsapp] connect() started");
  connectionStatus = "connecting";
  currentQR = null;
  connectPromise = createSocket();
  try {
    sock = await connectPromise;
    console.log("[whatsapp] socket created, waiting for QR or open");
    return sock;
  } catch (e) {
    connectPromise = null;
    connectionStatus = "disconnected";
    console.error("[whatsapp] connect failed", e);
    throw e;
  }
}

export async function sendToGroup(groupJid: string, text: string): Promise<void> {
  const socket = sock ?? (await connect());
  await socket.sendMessage(groupJid, { text });
}

export async function sendComposing(groupJid: string, durationMs: number): Promise<void> {
  const socket = sock ?? (await connect());
  await socket.sendPresenceUpdate("composing", groupJid);
  await new Promise((r) => setTimeout(r, durationMs));
  await socket.sendPresenceUpdate("paused", groupJid);
}

export async function fetchAllGroups(): Promise<{ id: string; subject?: string }[]> {
  const socket = sock ?? (await connect());
  const groups = await socket.groupFetchAllParticipating();
  return Object.values(groups).map((g) => ({ id: g.id, subject: g.subject }));
}
