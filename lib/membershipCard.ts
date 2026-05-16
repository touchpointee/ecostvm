import path from "path";
import fs from "fs";
import sharp from "sharp";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "image.png");
const BASE_WIDTH = 1235;
const BASE_HEIGHT = 849;
const CARD_WIDTH = 1584;
const CARD_HEIGHT = 1004;
const FONT_FAMILY = "'Poppins', Arial, Helvetica, sans-serif";
const POPPINS_FONT_DIR = path.join(process.cwd(), "node_modules", "@fontsource", "poppins", "files");

function fontDataUri(weight: 700 | 800 | 900): string {
  const fontPath = path.join(POPPINS_FONT_DIR, `poppins-latin-${weight}-normal.woff2`);
  return `data:font/woff2;base64,${fs.readFileSync(fontPath).toString("base64")}`;
}

const POPPINS_FONT_FACE_CSS = `
  @font-face {
    font-family: 'Poppins';
    font-style: normal;
    font-weight: 700;
    src: url('${fontDataUri(700)}') format('woff2');
  }
  @font-face {
    font-family: 'Poppins';
    font-style: normal;
    font-weight: 800;
    src: url('${fontDataUri(800)}') format('woff2');
  }
  @font-face {
    font-family: 'Poppins';
    font-style: normal;
    font-weight: 900;
    src: url('${fontDataUri(900)}') format('woff2');
  }
`;

function sx(value: number): number {
  return Math.round((value / BASE_WIDTH) * CARD_WIDTH);
}

function sy(value: number): number {
  return Math.round((value / BASE_HEIGHT) * CARD_HEIGHT);
}

function sf(value: number): number {
  return Math.round(value * Math.min(CARD_WIDTH / BASE_WIDTH, CARD_HEIGHT / BASE_HEIGHT));
}

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
  if (length <= 10) return 38;
  if (length <= 16) return 34;
  return 30;
}

function buildMemberOverlay(name: string, membershipNumber: string, vehicleNumber: string): string {
  const safeName = escapeXml(name.trim() || "Member");
  const safeMembershipNumber = escapeXml(membershipNumber.trim() || "-");
  const safeVehicleNumber = escapeXml(vehicleNumber.trim().toUpperCase() || "-");
  const nameFontSize = sf(getNameFontSize(safeName));
  const membershipFontSize = sf(getValueFontSize(safeMembershipNumber));
  const vehicleFontSize = sf(getValueFontSize(safeVehicleNumber));

  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          <![CDATA[
${POPPINS_FONT_FACE_CSS}
          ]]>
        </style>
        <filter id="label-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#label-shadow)">
        <text
          x="${sx(1185)}"
          y="${sy(30)}"
          text-anchor="end"
          font-size="${sf(24)}"
          font-family="${FONT_FAMILY}"
          font-weight="800"
          stroke="#101010"
          stroke-width="${sf(3)}"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#f5e400"
        >www.ecostvm.com</text>

        <text
          x="${sx(52)}"
          y="${sy(517)}"
          text-anchor="start"
          font-size="${nameFontSize}"
          font-family="${FONT_FAMILY}"
          font-weight="800"
          stroke="#101010"
          stroke-width="${sf(5)}"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#f5e400"
        >${safeName}</text>

        <text
          x="${sx(890)}"
          y="${sy(670)}"
          text-anchor="end"
          font-size="${sf(25)}"
          font-family="${FONT_FAMILY}"
          font-weight="800"
          letter-spacing="1.2"
          stroke="#101010"
          stroke-width="${sf(4)}"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#f5e400"
        >MEMBERSHIP NO :</text>
        <text
          x="${sx(915)}"
          y="${sy(673)}"
          text-anchor="start"
          font-size="${membershipFontSize}"
          font-family="${FONT_FAMILY}"
          font-weight="800"
          stroke="#101010"
          stroke-width="${sf(5)}"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#ffffff"
        >${safeMembershipNumber}</text>

        <text
          x="${sx(890)}"
          y="${sy(735)}"
          text-anchor="end"
          font-size="${sf(25)}"
          font-family="${FONT_FAMILY}"
          font-weight="800"
          letter-spacing="1.2"
          stroke="#101010"
          stroke-width="${sf(4)}"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#f5e400"
        >VEHICLE NO :</text>
        <text
          x="${sx(915)}"
          y="${sy(738)}"
          text-anchor="start"
          font-size="${vehicleFontSize}"
          font-family="${FONT_FAMILY}"
          font-weight="900"
          stroke="#101010"
          stroke-width="${sf(6)}"
          paint-order="stroke fill"
          stroke-linejoin="round"
          fill="#ffffff"
        >${safeVehicleNumber}</text>
      </g>
    </svg>
  `;
}

export async function renderMembershipCard(name: string, membershipNumber: string, vehicleNumber: string): Promise<Buffer> {
  const overlay = Buffer.from(buildMemberOverlay(name, membershipNumber, vehicleNumber));

  return sharp(TEMPLATE_PATH)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
