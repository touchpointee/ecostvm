import { Client, MessageMedia, RemoteAuth } from "whatsapp-web.js";
import path from "path";
import { access, lstat, mkdir, readdir, rm, unlink } from "fs/promises";
import { MongoSessionStore } from "./whatsappSessionStore";
import { saveStoredQR } from "./whatsappQRStore";

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
        mediaPatchApplied: boolean;
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
    mediaPatchApplied: false,
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
  await saveStoredQR(null);
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

async function ensureMediaSendPatch(client: Client): Promise<void> {
  if (G.mediaPatchApplied) return;

  const page = (client as Client & { pupPage?: { evaluate: (fn: () => void) => Promise<void> } }).pupPage;
  if (!page) return;

  await page.evaluate(() => {
    type WWebJSWithPatch = {
      sendMessage: (chat: unknown, content: unknown, options?: Record<string, unknown>) => Promise<unknown>;
      __ecostvmMediaPatchApplied?: boolean;
    };

    const wweb = (window as Window & typeof globalThis & { WWebJS?: WWebJSWithPatch }).WWebJS;
    if (!wweb || wweb.__ecostvmMediaPatchApplied) return;

    const originalSendMessage = wweb.sendMessage.bind(wweb);
    wweb.sendMessage = async (chat, content, options = {}) => {
      if (options.media) {
        const caption =
          typeof options.caption === "string" && options.caption.trim()
            ? options.caption.trim()
            : typeof content === "string" && content.trim()
              ? content.trim()
              : " ";
        content = " ";
        options.caption = caption;
        options.extraOptions = {
          ...(typeof options.extraOptions === "object" && options.extraOptions ? options.extraOptions : {}),
          body: caption,
        };
      }
      return originalSendMessage(chat, content, options);
    };
    wweb.__ecostvmMediaPatchApplied = true;
  });

  G.mediaPatchApplied = true;
}

// ─── Create & wire up a new Client ───────────────────────────────────────────
const store = new MongoSessionStore();

class SafeRemoteAuth extends RemoteAuth {
  async deleteMetadata() {
    const self = this as unknown as RemoteAuth & {
      tempDir: string;
      requiredDirs: string[];
      rmMaxRetries: number;
    };

    const sessionDirs = [self.tempDir, path.join(self.tempDir, "Default")];

    for (const dir of sessionDirs) {
      try {
        await access(dir);
      } catch {
        await mkdir(dir, { recursive: true }).catch(() => {});
        continue;
      }

      let sessionFiles: string[] = [];
      try {
        sessionFiles = await readdir(dir);
      } catch {
        continue;
      }

      for (const element of sessionFiles) {
        if (self.requiredDirs.includes(element)) continue;

        const dirElement = path.join(dir, element);
        try {
          const stats = await lstat(dirElement);
          if (stats.isDirectory()) {
            await rm(dirElement, {
              recursive: true,
              force: true,
              maxRetries: self.rmMaxRetries,
            }).catch(() => {});
          } else {
            await unlink(dirElement).catch(() => {});
          }
        } catch {
          // Ignore files that disappear while the profile is being prepared.
        }
      }
    }
  }
}

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

  // Only use PUPPETEER_EXECUTABLE_PATH if set. Do NOT fall back to /usr/bin/chromium-browser
  // on Linux – on Ubuntu 22+ that is a snap stub and fails in Docker with "requires the chromium snap".
  // When unset, Puppeteer uses its own downloaded Chromium (ensure PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
  // is not set at build time in nixpacks).
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath) {
    const { access } = await import("fs/promises");
    try {
      await access(envPath);
      puppeteerConfig.executablePath = envPath;
      console.log(`[whatsapp] using Chromium at ${envPath}`);
    } catch {
      throw new Error(
        `Chromium not found at "${envPath}". Check PUPPETEER_EXECUTABLE_PATH.`
      );
    }
  } else {
    console.log("[whatsapp] using Puppeteer default Chromium (no PUPPETEER_EXECUTABLE_PATH)");
  }

  const wclient = new Client({
    authStrategy: new SafeRemoteAuth({
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
    void saveStoredQR(qr);
    console.log("[whatsapp] QR received");
  });

  wclient.on("ready", () => {
    wasReady = true;
    G.connectionStatus = "connected";
    G.currentQR = null;
    G.lastInitError = null;
    void saveStoredQR(null);
    console.log("[whatsapp] client ready");
    void ensureMediaSendPatch(wclient).catch((error) => {
      console.error("[whatsapp] failed to patch media send behavior", error);
    });
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
    await saveStoredQR(null);

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
      await saveStoredQR(null);
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
      await saveStoredQR(null);
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
  await saveStoredQR(null);

  G.connectPromise = createClient();
  try {
    G.client = await G.connectPromise;
    await ensureMediaSendPatch(G.client);
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
    lower.includes("not connected") ||
    lower.includes("detached frame") ||
    lower.includes("detached") ||
    lower.includes("target closed") ||
    lower.includes("session closed") ||
    lower.includes("protocol error")
  );
}

export function clearSocketIfClosed(): void {
  G.client = null;
  G.connectPromise = null;
  G.readyPromise = null;
  G.readyResolve = null;
  G.connectionStatus = "disconnected";
  G.currentQR = null;
  G.mediaPatchApplied = false;
  void saveStoredQR(null);
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

export async function sendImageToGroupWithRetry(
  groupJid: string,
  image: Buffer,
  filename: string,
  caption?: string
): Promise<void> {
  const safeCaption = caption?.trim() || undefined;

  let c: Client;
  try {
    c = await getClientWhenReady();
    await sendImageToGroup(groupJid, image, filename, safeCaption, c);
  } catch (e) {
    if (isConnectionError(e)) {
      console.warn("[whatsapp] image send failed (connection error), retrying once:", e);
      clearSocketIfClosed();
      await connect();
      c = await getClientWhenReady();
      await sendImageToGroup(groupJid, image, filename, safeCaption, c);
    } else {
      throw e;
    }
  }
}

async function sendImageToGroup(
  groupJid: string,
  image: Buffer,
  filename: string,
  caption: string | undefined,
  client: Client
): Promise<void> {
  const page = (client as Client & {
    pupPage?: {
      evaluate: <TArg, TResult>(fn: (arg: TArg) => Promise<TResult>, arg: TArg) => Promise<TResult>;
    };
  }).pupPage;

  if (!page) {
    throw new Error("WhatsApp page is not available.");
  }

  const media = new MessageMedia("image/png", image.toString("base64"), filename);

  await page.evaluate(
    async ({
      groupJid,
      media,
      caption,
    }: {
      groupJid: string;
      media: { mimetype: string; data: string; filename?: string | null };
      caption?: string;
    }) => {
      const browserWindow = window as Window &
        typeof globalThis & {
          WWebJS: {
            getChat: (chatId: string, options: { getAsModel: boolean }) => Promise<any>;
            sendSeen: (chatId: string) => Promise<boolean>;
            processMediaData: (
              mediaInfo: { mimetype: string; data: string; filename?: string | null },
              options: {
                forceSticker: boolean;
                forceGif: boolean;
                forceVoice: boolean;
                forceDocument: boolean;
                forceMediaHd: boolean;
                sendToChannel: boolean;
                sendToStatus: boolean;
              }
            ) => Promise<any>;
          };
          Store: any;
        };

      const chat = await browserWindow.WWebJS.getChat(groupJid, { getAsModel: false });
      if (!chat) {
        throw new Error("Group not found");
      }

      await browserWindow.WWebJS.sendSeen(groupJid);

      const mediaOptions = await browserWindow.WWebJS.processMediaData(media, {
        forceSticker: false,
        forceGif: false,
        forceVoice: false,
        forceDocument: false,
        forceMediaHd: false,
        sendToChannel: false,
        sendToStatus: false,
      });

      mediaOptions.caption = caption;

      const lidUser = browserWindow.Store.User.getMaybeMeLidUser();
      const meUser = browserWindow.Store.User.getMaybeMePnUser();
      let from = chat.id.isLid() ? lidUser : meUser;
      let participant;

      if (typeof chat.id?.isGroup === "function" && chat.id.isGroup()) {
        from = chat.groupMetadata && chat.groupMetadata.isLidAddressingMode ? lidUser : meUser;
        participant = browserWindow.Store.WidFactory.asUserWidOrThrow(from);
      }

      const newId = await browserWindow.Store.MsgKey.newId();
      const newMsgKey = new browserWindow.Store.MsgKey({
        from,
        to: chat.id,
        id: newId,
        participant,
        selfDir: "out",
      });

      const ephemeralFields = browserWindow.Store.EphemeralFields.getEphemeralFields(chat);
      const message = {
        id: newMsgKey,
        ack: 0,
        body: " ",
        from,
        to: chat.id,
        local: true,
        self: "out",
        t: Math.floor(Date.now() / 1000),
        isNewMsg: true,
        type: mediaOptions.type ?? "image",
        ...ephemeralFields,
        ...mediaOptions,
        ...(typeof mediaOptions.toJSON === "function" ? mediaOptions.toJSON() : {}),
      };

      const [msgPromise] = browserWindow.Store.SendMessage.addAndSendMsgToChat(chat, message);
      await msgPromise;
    },
    {
      groupJid,
      media: {
        mimetype: media.mimetype,
        data: media.data,
        filename: media.filename,
      },
      caption,
    }
  );
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
