import AdmZip from "adm-zip";
import { MemberInput, MemberRecord, normalizeMembershipNumber } from "./members";

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

function parseRowsFromXml(xml: string, sharedStrings: string[]): string[][] {
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

function readWorksheetRows(zip: AdmZip, sharedStrings: string[]): string[][] {
  // Collect all worksheet entries
  const allSheets = zip
    .getEntries()
    .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/(\d+)\.xml$/)?.[1] ?? "0");
      const numB = parseInt(b.entryName.match(/(\d+)\.xml$/)?.[1] ?? "0");
      return numA - numB;
    });

  if (allSheets.length === 0) {
    throw new Error("No worksheet found in Excel file.");
  }

  // Pick the sheet whose header row has the most non-empty columns
  let bestRows: string[][] = [];
  let bestHeaderCount = 0;

  for (const entry of allSheets) {
    const xml = entry.getData().toString("utf8");
    const rows = parseRowsFromXml(xml, sharedStrings).filter((row) => row.some(Boolean));
    if (rows.length < 2) continue;
    const headerCount = (rows[0] ?? []).filter(Boolean).length;
    console.log(`[xlsx] sheet "${entry.entryName}": ${rows.length} rows, ${headerCount} header cols`);
    if (headerCount > bestHeaderCount) {
      bestHeaderCount = headerCount;
      bestRows = rows;
    }
  }

  if (bestRows.length === 0) {
    // fallback: just parse the first sheet
    const xml = allSheets[0].getData().toString("utf8");
    return parseRowsFromXml(xml, sharedStrings).filter((row) => row.some(Boolean));
  }

  return bestRows;
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

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(normalizeHeader);
  console.log("[xlsx] detected headers:", headers);
  const getValue = (row: string[], aliases: string[]) => {
    const index = headers.findIndex((header) => aliases.includes(header));
    return index >= 0 ? row[index] ?? "" : "";
  };

  return rows.slice(1).map((row) => ({
    name: getValue(row, ["name", "fullname"]),
    membershipNumber: normalizeMembershipNumber(getValue(row, [
      "membershipno", "membershipnumber", "membership",
      "memberid", "memberno", "membershipid",
    ])),
    contactNumber: getValue(row, [
      "contactno", "contactnumber", "phonenumber",
      "mobileno", "mobile", "phone", "contact",
    ]),
    model: getValue(row, [
      "model", "mode", "modelofthevehicle", "vehiclemodel",
      "carmodel", "carormodel",
    ]),
    purchaseMonth: getValue(row, [
      "purchasemonth", "purchase", "monthofpurchase",
      "purchasedate", "datofpurchase",
    ]),
    manufacturingYear: getValue(row, [
      "manufacturingyear", "manufactureyear", "year",
      "mfgyear", "yearofmanufacturing", "yearofmanufacture",
    ]),
    variant: getValue(row, [
      "variant", "variantname", "carvariant",
    ]),
    vehicleColor: getValue(row, [
      "colorofthevehicle", "vehiclecolor", "color",
      "colour", "vehiclecolour", "colorofvehicle",
    ]),
    vehicleNumber: getValue(row, [
      "vehicleno", "vehiclenumber", "registrationnumber",
      "regnumber", "regno", "vehicleregnumber", "vehicleregistration",
    ]),
    place: getValue(row, [
      "place", "location", "city", "town",
    ]),
    address: getValue(row, [
      "address", "fulladdress", "streetaddress",
    ]),
    occupation: getValue(row, [
      "occupation", "job", "profession", "work",
    ]),
    mailId: getValue(row, [
      "mailid", "email", "mail", "emailid",
      "emailaddress", "mailidaddress",
    ]),
    bloodGroup: getValue(row, [
      "bloodgroup", "blood", "bloodtype", "bg",
    ]),
    dateOfBirth: getValue(row, [
      "dateofbirthborndate", "dateofbirth", "borndate",
      "dob", "birthdate", "dateofbirthborndate",
      "dateofbirth", "birthdate", "dob",
    ]),
    emergencyContact: getValue(row, [
      "emergencycontactnumbers", "emergencycontactnumber",
      "emergencycontact", "emergency", "emergencynumber",
      "emergencyno", "emergencycontactno",
    ]),
    suggestions: (() => {
      const raw = getValue(row, ["suggestionsifany", "suggestions", "suggestion"]).trim();
      // If the cell contains only digits (e.g. accidental numbers in the sheet), discard it
      return /^\d+$/.test(raw) ? "" : raw;
    })(),
    // Status mapping: "Active"/empty → active; "Sold" → sold; anything else → blocked
    isBlocked: (() => {
      const s = getValue(row, ["memberstatus", "status", "membersstatus"]).trim().toLowerCase();
      return s !== "" && s !== "active" && s !== "sold";
    })(),
    isSold: (() => {
      const s = getValue(row, ["memberstatus", "status", "membersstatus"]).trim().toLowerCase();
      return s === "sold";
    })(),
    source: "upload",
  }));
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function excelColumnName(index: number): string {
  let current = index + 1;
  let result = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

export function createMembersWorkbook(members: MemberRecord[]): Buffer {
  const headers = [
    "Name",
    "Membership no",
    "Contact no",
    "Model",
    "Purchase Month",
    "Manufacturing Year",
    "Variant",
    "Color of the vehicle",
    "Vehicle no",
    "Place",
    "Address",
    "Occupation",
    "Mail ID",
    "Blood Group",
    "Date of birth ( Born date )",
    "Emergency Contact",
    "Suggestions",
    "Status",
  ];

  const rows = [
    headers,
    ...members.map((member) => [
      member.name,
      member.membershipNumber,
      member.contactNumber,
      member.model,
      member.purchaseMonth,
      member.manufacturingYear,
      member.variant,
      member.vehicleColor,
      member.vehicleNumber,
      member.place,
      member.address,
      member.occupation,
      member.mailId,
      member.bloodGroup,
      member.dateOfBirth,
      member.emergencyContact,
      member.suggestions,
      member.isBlocked ? "Blocked" : member.isSold ? "Sold" : "Active",
    ]),
  ];

  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${excelColumnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(String(value ?? ""))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Members" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const created = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>EcoSport TVM</dc:creator>
  <cp:lastModifiedBy>EcoSport TVM</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>EcoSport TVM</Application>
</Properties>`;

  const zip = new AdmZip();
  zip.addFile("[Content_Types].xml", Buffer.from(contentTypesXml, "utf8"));
  zip.addFile("_rels/.rels", Buffer.from(rootRelsXml, "utf8"));
  zip.addFile("xl/workbook.xml", Buffer.from(workbookXml, "utf8"));
  zip.addFile("xl/_rels/workbook.xml.rels", Buffer.from(workbookRelsXml, "utf8"));
  zip.addFile("xl/worksheets/sheet1.xml", Buffer.from(sheetXml, "utf8"));
  zip.addFile("xl/styles.xml", Buffer.from(stylesXml, "utf8"));
  zip.addFile("docProps/core.xml", Buffer.from(coreXml, "utf8"));
  zip.addFile("docProps/app.xml", Buffer.from(appXml, "utf8"));
  return zip.toBuffer();
}
