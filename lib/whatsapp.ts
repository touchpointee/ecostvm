import { Client, LocalAuth } from "whatsapp-web.js";
import path from "path";
import { rm } from "fs/promises";

const AUTH_DIR = path.join(process.cwd(), ".data");

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "close";

let client: Client | null = null;
let currentQR: string | null = null;
let connectionStatus: ConnectionStatus = "disconnected";
let connectPromise: Promise<Client> | null = null;
let readyPromise: Promise<Client> | null = null;
let readyResolve: ((c: Client) => void) | null = null;

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

export function getCurrentQR(): string | null {
  return currentQR;
}

export function getSocket(): Client | null {
  return client;
}

export async function logout(): Promise<void> {
  try {
    if (client) {
      await client.logout();
      client.destroy();
    }
  } catch (e) {
    console.error("[whatsapp] logout failed", e);
  } finally {
    client = null;
    connectPromise = null;
    readyPromise = null;
    readyResolve = null;
    connectionStatus = "disconnected";
    currentQR = null;
    try {
      await rm(AUTH_DIR, { recursive: true, force: true });
    } catch (e) {
      console.error("[whatsapp] failed to remove auth directory", e);
    }
  }
}

async function createClient(): Promise<Client> {
  const puppeteerConfig: { executablePath?: string; args?: string[] } = {};
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    puppeteerConfig.args = ["--no-sandbox", "--disable-setuid-sandbox"];
  }

  const wclient = new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
    puppeteer: puppeteerConfig,
  });

  readyPromise = new Promise<Client>((resolve) => {
    readyResolve = resolve;
  });

  wclient.on("qr", (qr) => {
    currentQR = qr;
    connectionStatus = "connecting";
    console.log("[whatsapp] QR received");
  });

  wclient.on("ready", () => {
    connectionStatus = "connected";
    currentQR = null;
    console.log("[whatsapp] client ready");
    if (readyResolve) {
      readyResolve(wclient);
      readyResolve = null;
    }
  });

  wclient.on("disconnected", (reason) => {
    connectionStatus = "disconnected";
    currentQR = null;
    client = null;
    connectPromise = null;
    readyPromise = null;
    readyResolve = null;
    if (reason !== "LOGOUT") {
      setTimeout(() => connect(), 3000);
    }
  });

  wclient.initialize().catch((e) => {
    console.error("[whatsapp] initialize failed", e);
    connectionStatus = "disconnected";
    connectPromise = null;
  });

  return wclient;
}

async function getClientWhenReady(): Promise<Client> {
  if (connectionStatus === "connected" && client) return client;
  if (readyPromise) return readyPromise;
  throw new Error("WhatsApp not connected");
}

export async function connect(): Promise<Client> {
  if (client && connectionStatus === "connected") return client;
  if (connectPromise) return connectPromise;
  console.log("[whatsapp] connect() started");
  connectionStatus = "connecting";
  currentQR = null;
  connectPromise = createClient();
  try {
    client = await connectPromise;
    console.log("[whatsapp] client created, waiting for QR or ready");
    return client;
  } catch (e) {
    connectPromise = null;
    connectionStatus = "disconnected";
    console.error("[whatsapp] connect failed", e);
    throw e;
  }
}

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
  client = null;
  connectPromise = null;
  readyPromise = null;
  readyResolve = null;
  connectionStatus = "disconnected";
  currentQR = null;
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
      console.warn("[whatsapp] send failed (connection error), clearing and retrying once:", e);
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
  const chat = await c.getChatById(groupJid);
  await chat.sendStateTyping();
  await new Promise((r) => setTimeout(r, durationMs));
  await chat.clearState();
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
