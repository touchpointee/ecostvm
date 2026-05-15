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
  if (length <= 12) return 76;
  if (length <= 20) return 66;
  if (length <= 30) return 56;
  return 48;
}

function getValueFontSize(value: string): number {
  const length = value.trim().length;
  if (length <= 10) return 46;
  if (length <= 16) return 40;
  return 34;
}

function buildMemberOverlay(name: string, membershipNumber: string, vehicleNumber: string): string {
  const safeName = escapeXml(name.trim() || "Member");
  const safeMembershipNumber = escapeXml(membershipNumber.trim() || "-");
  const safeVehicleNumber = escapeXml(vehicleNumber.trim().toUpperCase() || "-");
  const nameFontSize = getNameFontSize(safeName);
  const membershipFontSize = getValueFontSize(safeMembershipNumber);
  const vehicleFontSize = getValueFontSize(safeVehicleNumber);

  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="label-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#label-shadow)">
        <text
          x="618"
          y="382"
          text-anchor="middle"
          font-size="${nameFontSize}"
          font-family="Poppins, Arial, Helvetica, sans-serif"
          font-weight="800"
          stroke="#101010"
          stroke-width="5"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#fff9ea"
        >${safeName}</text>

        <text
          x="400"
          y="495"
          text-anchor="start"
          font-size="32"
          font-family="Poppins, Arial, Helvetica, sans-serif"
          font-weight="700"
          letter-spacing="1.2"
          stroke="#101010"
          stroke-width="3"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#d7b56a"
        >MEMBERSHIP NO</text>
        <text
          x="835"
          y="498"
          text-anchor="middle"
          font-size="${membershipFontSize}"
          font-family="Poppins, Arial, Helvetica, sans-serif"
          font-weight="800"
          stroke="#101010"
          stroke-width="4"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#fff9ea"
        >${safeMembershipNumber}</text>

        <text
          x="245"
          y="636"
          text-anchor="start"
          font-size="46"
          font-family="Poppins, Arial, Helvetica, sans-serif"
          font-weight="700"
          letter-spacing="1.2"
          stroke="#101010"
          stroke-width="4"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#d7b56a"
        >VEHICLE NO</text>
        <text
          x="650"
          y="640"
          text-anchor="start"
          font-size="${vehicleFontSize}"
          font-family="Poppins, Arial, Helvetica, sans-serif"
          font-weight="900"
          stroke="#101010"
          stroke-width="5"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#fff9ea"
        >${safeVehicleNumber}</text>
      </g>
    </svg>
  `;
}

export async function renderMembershipCard(name: string, membershipNumber: string, vehicleNumber: string): Promise<Buffer> {
  const overlay = Buffer.from(buildMemberOverlay(name, membershipNumber, vehicleNumber));

  return sharp(TEMPLATE_PATH)
    .resize(CARD_WIDTH, CARD_HEIGHT)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
