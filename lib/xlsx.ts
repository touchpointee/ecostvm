import AdmZip from "adm-zip";
import { MemberInput } from "./members";

function xmlDecode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function columnIndexFromRef(ref: string): number {
  const letters = ref.replace(/\d/g, "").toUpperCase();
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
}

function readSharedStrings(zip: AdmZip): string[] {
  const entry = zip.getEntry("xl/sharedStrings.xml");
  if (!entry) return [];
  const xml = entry.getData().toString("utf8");
  const items: string[] = [];
  const itemRegex = /<si[^>]*>([\s\S]*?)<\/si>/g;
  let itemMatch: RegExpExecArray | null = itemRegex.exec(xml);
  while (itemMatch) {
    const textParts: string[] = [];
    const textRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch: RegExpExecArray | null = textRegex.exec(itemMatch[1]);
    while (textMatch) {
      textParts.push(xmlDecode(textMatch[1]));
      textMatch = textRegex.exec(itemMatch[1]);
    }
    const text = textParts.join("");
    items.push(text.trim());
    itemMatch = itemRegex.exec(xml);
  }
  return items;
}

function readWorksheetRows(zip: AdmZip, sharedStrings: string[]): string[][] {
  const worksheetEntry =
    zip.getEntry("xl/worksheets/sheet1.xml") ??
    zip.getEntries().find((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.entryName));
  if (!worksheetEntry) {
    throw new Error("No worksheet found in Excel file.");
  }

  const xml = worksheetEntry.getData().toString("utf8");
  const rows: string[] = [];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null = rowRegex.exec(xml);
  while (rowMatch) {
    rows.push(rowMatch[1]);
    rowMatch = rowRegex.exec(xml);
  }

  return rows.map((rowXml) => {
    const values: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null = cellRegex.exec(rowXml);
    while (cellMatch) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const refMatch = attrs.match(/\br="([^"]+)"/);
      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const colIndex = refMatch ? columnIndexFromRef(refMatch[1]) : values.length;
      const type = typeMatch?.[1];
      let value = "";

      if (type === "s") {
        const sharedIndex = Number(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "-1");
        value = sharedStrings[sharedIndex] ?? "";
      } else if (type === "inlineStr") {
        value = xmlDecode(body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "");
      } else {
        value = xmlDecode(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
      }

      values[colIndex] = value.trim();
      cellMatch = cellRegex.exec(rowXml);
    }
    return values;
  });
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function parseMembersFromXlsx(buffer: Buffer): MemberInput[] {
  const zip = new AdmZip(buffer);
  const sharedStrings = readSharedStrings(zip);
  const rows = readWorksheetRows(zip, sharedStrings).filter((row) => row.some(Boolean));
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  const getValue = (row: string[], aliases: string[]) => {
    const index = headers.findIndex((header) => aliases.includes(header));
    return index >= 0 ? row[index] ?? "" : "";
  };

  return rows.slice(1).map((row) => ({
    name: getValue(row, ["name", "fullname"]),
    membershipNumber: getValue(row, ["membershipno", "membershipnumber", "membership"]),
    contactNumber: getValue(row, ["contactno", "contactnumber", "phonenumber", "mobileno", "mobile"]),
    vehicleColor: getValue(row, ["colorofthevehicle", "vehiclecolor", "color"]),
    vehicleNumber: getValue(row, ["vehicleno", "vehiclenumber", "registrationnumber"]),
    place: getValue(row, ["place", "location"]),
    address: getValue(row, ["address", "fulladdress"]),
    bloodGroup: getValue(row, ["bloodgroup", "blood"]),
    dateOfBirth: getValue(row, ["dateofbirthborndate", "dateofbirth", "borndate", "dob"]),
    source: "upload",
  }));
}
