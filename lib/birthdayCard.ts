import path from "path";
import sharp from "sharp";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "birthday-template.png");
const CARD_WIDTH = 1280;
const CARD_HEIGHT = 718;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getNameFontSize(name: string): number {
  const length = name.trim().length;
  if (length <= 10) return 72;
  if (length <= 16) return 60;
  if (length <= 24) return 50;
  return 42;
}

function buildNameOverlay(name: string): string {
  const safeName = escapeXml(name.trim() || "Member");
  const fontSize = getNameFontSize(safeName);

  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="name-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.35)" />
        </filter>
      </defs>
      <text
        x="640"
        y="380"
        text-anchor="middle"
        font-size="${fontSize}"
        font-family="Georgia, Times New Roman, serif"
        font-weight="700"
        fill="#fffaf2"
        filter="url(#name-shadow)"
      >${safeName}</text>
    </svg>
  `;
}

export async function renderBirthdayCard(name: string): Promise<Buffer> {
  const overlay = Buffer.from(buildNameOverlay(name));

  return sharp(TEMPLATE_PATH)
    .resize(CARD_WIDTH, CARD_HEIGHT)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
