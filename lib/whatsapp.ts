import { Client, RemoteAuth } from "whatsapp-web.js";
import path from "path";
import { rm } from "fs/promises";
import { MongoSessionStore } from "./whatsappSessionStore";

// RemoteAuth uses clientId "main" → temp dir is wwebjs_temp_session_main
const WWEBJS_AUTH_DIR = path.join(process.cwd(), ".wwebjs_auth");
const SESSION_DIR = path.join(WWEBJS_AUTH_DIR, "wwebjs_temp_session_main");
const SESSION_ID = "main";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "close";

// ─── Global state (survives Next.js HMR hot-reloads in dev) ──────────────────
// Keeping the Client reference on `global` means the Chrome process is never
// orphaned when the module is reloaded, which prevents "browser already running".
declare global {
  // eslint-disable-next-line no-var
  var _wwjs:
    | {
        client: Client | null;
        currentQR: string | null;
        connectionStatus: ConnectionStatus;
        connectPromise: Promise<Client> | null;
        readyPromise: Promise<Client> | null;
        readyResolve: ((c: Client) => void) | null;
        lastInitError: string | null;
      }
    | undefined;
}

if (!global._wwjs) {
  global._wwjs = {
    client: null,
    currentQR: null,
    connectionStatus: "disconnected",
    connectPromise: null,
    readyPromise: null,
    readyResolve: null,
    lastInitError: null,
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
export function getSocket(): Client | null {
  return G.client;
}

// ─── Logout / remove all connections ─────────────────────────────────────────
export async function logout(): Promise<void> {
  const prev = G.client;
  G.client = null;
  G.connectPromise = null;
  G.readyPromise = null;
  G.readyResolve = null;
  G.connectionStatus = "disconnected";
  G.currentQR = null;
  G.lastInitError = null;
  try {
    if (prev) {
      try { await prev.logout(); } catch {}
      try { await prev.destroy(); } catch {}
    }
    // Delete the session from MongoDB and the local temp dir
    const store = new MongoSessionStore();
    try { await store.delete({ session: SESSION_ID }); } catch {}
    await rm(WWEBJS_AUTH_DIR, { recursive: true, force: true });
  } catch (e) {
    console.error("[whatsapp] logout cleanup failed", e);
  }
}

// ─── Chrome lock helpers ──────────────────────────────────────────────────────
async function destroyExistingClient(): Promise<void> {
  if (G.client) {
    const old = G.client;
    G.client = null;
    try { await old.destroy(); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function clearBrowserLock(): Promise<void> {
  for (const f of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    try { await rm(path.join(SESSION_DIR, f), { force: true }); } catch {}
  }
}

// ─── Create & wire up a new Client ───────────────────────────────────────────
const store = new MongoSessionStore();

async function createClient(): Promise<Client> {
  await destroyExistingClient();
  await clearBrowserLock();

  const puppeteerConfig: {
    executablePath?: string;
    args?: string[];
    headless?: boolean;
  } = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  };

  const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (chromiumPath) {
    // Verify the binary actually exists before trying to launch
    const { access } = await import("fs/promises");
    try {
      await access(chromiumPath);
    } catch {
      throw new Error(
        `Chromium not found at "${chromiumPath}". ` +
        `Check PUPPETEER_EXECUTABLE_PATH. Common paths: /usr/bin/chromium, /usr/bin/chromium-browser`
      );
    }
    puppeteerConfig.executablePath = chromiumPath;
    console.log(`[whatsapp] using Chromium at ${chromiumPath}`);
  } else {
    console.warn("[whatsapp] PUPPETEER_EXECUTABLE_PATH not set – using bundled Chromium (may fail in Docker)");
  }

  const wclient = new Client({
    authStrategy: new RemoteAuth({
      clientId: SESSION_ID,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store: store as any, // wweb.js types omit `data` from Store.save signature
      backupSyncIntervalMs: 5 * 60 * 1000, // sync session to MongoDB every 5 min
    }),
    puppeteer: puppeteerConfig,
  });

  G.readyPromise = new Promise<Client>((resolve) => {
    G.readyResolve = resolve;
  });

  // Track whether we ever reached "ready" so we can detect a bad session restore
  let wasReady = false;

  wclient.on("qr", (qr) => {
    G.currentQR = qr;
    G.connectionStatus = "connecting";
    G.lastInitError = null;
    console.log("[whatsapp] QR received");
  });

  wclient.on("ready", () => {
    wasReady = true;
    G.connectionStatus = "connected";
    G.currentQR = null;
    G.lastInitError = null;
    console.log("[whatsapp] client ready");
    if (G.readyResolve) {
      G.readyResolve(wclient);
      G.readyResolve = null;
    }
  });

  wclient.on("remote_session_saved", () => {
    console.log("[whatsapp] session saved to MongoDB");
  });

  wclient.on("disconnected", async (reason) => {
    console.log(`[whatsapp] disconnected: ${reason}`);
    G.connectionStatus = "disconnected";
    G.currentQR = null;
    G.connectPromise = null;
    G.readyPromise = null;
    G.readyResolve = null;

    if (reason === "LOGOUT") {
      G.client = null;
      return;
    }

    // If we disconnected before ever reaching "ready", the restored session is
    // invalid (e.g. cross-OS Chrome profile mismatch). Delete it so the next
    // connect starts fresh and shows a QR instead of looping forever.
    if (!wasReady) {
      console.warn("[whatsapp] disconnected before ready – purging possibly corrupt session from MongoDB");
      G.lastInitError = `Session was invalid (reason: ${reason}) – purged from DB, reconnecting with fresh QR…`;
      try { await store.delete({ session: SESSION_ID }); } catch {}
    }

    setTimeout(() => {
      connect().catch((e) => console.error("[whatsapp] auto-reconnect failed", e));
    }, 5000);
  });

  wclient.initialize().catch(async (e) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp] initialize failed:", msg);

    if (msg.toLowerCase().includes("already running")) {
      // Stale Chrome from a previous dev session – clear the local temp dir and retry
      console.warn("[whatsapp] stale Chrome detected – clearing temp dir and retrying in 2s…");
      G.connectPromise = null;
      G.client = null;
      G.readyPromise = null;
      G.readyResolve = null;
      G.connectionStatus = "disconnected";
      try { await rm(SESSION_DIR, { recursive: true, force: true }); } catch {}
      setTimeout(() => {
        connect().catch((err) => console.error("[whatsapp] retry after lock failed", err));
      }, 2000);
    } else {
      G.lastInitError = msg;
      G.connectionStatus = "disconnected";
      G.connectPromise = null;
      G.client = null;
      G.readyPromise = null;
      G.readyResolve = null;
    }
  });

  return wclient;
}

// ─── Connect ──────────────────────────────────────────────────────────────────
async function getClientWhenReady(): Promise<Client> {
  if (G.connectionStatus === "connected" && G.client) return G.client;
  if (G.readyPromise) return G.readyPromise;
  if (G.client) return G.client;
  throw new Error("WhatsApp not connected. Please click Connect WhatsApp in the admin dashboard.");
}

export async function connect(): Promise<Client> {
  if (G.client && G.connectionStatus === "connected") return G.client;
  if (G.connectPromise) return G.connectPromise;

  console.log("[whatsapp] connect() started");
  G.lastInitError = null;
  G.connectionStatus = "connecting";
  G.currentQR = null;

  G.connectPromise = createClient();
  try {
    G.client = await G.connectPromise;
    console.log("[whatsapp] client created, waiting for QR or ready");
    return G.client;
  } catch (e) {
    G.connectPromise = null;
    G.connectionStatus = "disconnected";
    console.error("[whatsapp] connect failed", e);
    throw e;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  return (
    lower.includes("connection closed") ||
    lower.includes("socket closed") ||
    lower.includes("econnreset") ||
    lower.includes("econnrefused") ||
    lower.includes("not connected")
  );
}

export function clearSocketIfClosed(): void {
  G.client = null;
  G.connectPromise = null;
  G.readyPromise = null;
  G.readyResolve = null;
  G.connectionStatus = "disconnected";
  G.currentQR = null;
}

export async function sendToGroup(groupJid: string, text: string): Promise<void> {
  const c = await getClientWhenReady();
  await c.sendMessage(groupJid, text);
}

export async function sendToGroupWithRetry(groupJid: string, text: string): Promise<void> {
  let c: Client;
  try {
    c = await getClientWhenReady();
    await c.sendMessage(groupJid, text);
  } catch (e) {
    if (isConnectionError(e)) {
      console.warn("[whatsapp] send failed (connection error), retrying once:", e);
      clearSocketIfClosed();
      await connect();
      c = await getClientWhenReady();
      await c.sendMessage(groupJid, text);
    } else {
      throw e;
    }
  }
}

export async function sendComposing(groupJid: string, durationMs: number): Promise<void> {
  const c = await getClientWhenReady();
  try {
    const chat = await c.getChatById(groupJid);
    await chat.sendStateTyping();
    await new Promise((r) => setTimeout(r, durationMs));
    await chat.clearState();
  } catch {
    // typing indicator is best-effort
  }
}

export async function fetchAllGroups(): Promise<{ id: string; subject?: string }[]> {
  const c = await getClientWhenReady();
  const chats = await c.getChats();
  const groups = chats.filter((chat) => chat.isGroup);
  return groups.map((g) => ({
    id: typeof g.id === "string" ? g.id : (g.id as { _serialized: string })._serialized,
    subject: g.name,
  }));
}
