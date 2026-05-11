import path from "path";
import sharp from "sharp";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "image.png");
const CARD_WIDTH = 1235;
const CARD_HEIGHT = 849;

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
  if (length <= 12) return 42;
  if (length <= 20) return 36;
  if (length <= 30) return 30;
  return 26;
}

function buildMemberOverlay(name: string, membershipNumber: string): string {
  const safeName = escapeXml(name.trim() || "Member");
  const safeMembershipNumber = escapeXml(membershipNumber.trim() || "-");
  const nameFontSize = getNameFontSize(safeName);

  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="label-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      <g filter="url(#label-shadow)">
        <rect x="790" y="72" width="365" height="116" rx="18" fill="rgba(0,0,0,0.62)" stroke="#d7b56a" stroke-width="2" />
        <text
          x="972"
          y="119"
          text-anchor="middle"
          font-size="${nameFontSize}"
          font-family="Arial, Helvetica, sans-serif"
          font-weight="800"
          fill="#fff9ea"
        >${safeName}</text>
        <text
          x="972"
          y="158"
          text-anchor="middle"
          font-size="25"
          font-family="Arial, Helvetica, sans-serif"
          font-weight="700"
          fill="#d7b56a"
        >Membership No: ${safeMembershipNumber}</text>
      </g>
    </svg>
  `;
}

export async function renderMembershipCard(name: string, membershipNumber: string): Promise<Buffer> {
  const overlay = Buffer.from(buildMemberOverlay(name, membershipNumber));

  return sharp(TEMPLATE_PATH)
    .resize(CARD_WIDTH, CARD_HEIGHT)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
