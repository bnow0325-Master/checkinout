import { inflateRawSync } from "zlib";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type ParsedCommuteRow = {
  rowNumber: number;
  workStyle: string;
  name: string;
  loginId: string;
  department: string;
  baseDate: Date;
  baseDateKey: string;
  workType: string;
  schedule: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  checkInRaw: string;
  checkOutRaw: string;
  workLocation: string;
  breakMinutes: number;
  offsiteMinutes: number;
  absenceMinutes: number;
  late: boolean;
  earlyLeave: boolean;
  requiredWorkCompliant: string;
  scheduleCompliant: string;
  scheduleVariance: string;
};

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

const REQUIRED_HEADERS = [
  "근무 방식",
  "이름",
  "로그인 아이디",
  "부서",
  "기준일",
  "근무 구분",
  "근무 일정",
  "출근",
  "퇴근",
  "근무 위치",
  "휴게",
  "외부 근무",
  "부재",
  "지각",
  "조퇴",
  "의무 근로 준수",
  "근무 일정 준수",
  "근무 일정 대비 과부족",
] as const;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function xmlDecode(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripXmlTags(value: string) {
  return xmlDecode(value.replace(/<[^>]+>/g, ""));
}

function columnIndex(cellRef: string) {
  const letters = cellRef.replace(/\d+/g, "");
  let index = 0;
  for (const char of letters) {
    index = index * 26 + char.charCodeAt(0) - 64;
  }
  return index - 1;
}

function findEndOfCentralDirectory(buffer: Buffer) {
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error("엑셀 파일 구조를 읽을 수 없습니다.");
}

function readZipEntries(buffer: Buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("엑셀 파일 목차를 읽을 수 없습니다.");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");

    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipFile(buffer: Buffer, entries: ZipEntry[], name: string) {
  const entry = entries.find((item) => item.name === name);
  if (!entry) return null;

  const offset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error("엑셀 파일 항목을 읽을 수 없습니다.");
  }

  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(
    dataStart,
    dataStart + entry.compressedSize,
  );

  if (entry.method === 0) return compressed.toString("utf8");
  if (entry.method === 8) return inflateRawSync(compressed).toString("utf8");
  throw new Error("지원하지 않는 엑셀 압축 방식입니다.");
}

function parseSharedStrings(xml: string | null) {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const textNodes = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)];
    if (textNodes.length === 0) return stripXmlTags(match[1]);
    return textNodes.map((textNode) => xmlDecode(textNode[1])).join("");
  });
}

function parseSheetRows(xml: string, sharedStrings: string[]) {
  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = /r="([^"]+)"/.exec(attrs)?.[1];
      if (!ref) continue;

      const valueRaw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      const inlineRaw =
        /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? "";
      const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? "";
      let value = "";
      if (type === "s") {
        value = sharedStrings[Number(valueRaw)] ?? "";
      } else if (type === "inlineStr") {
        value = stripXmlTags(inlineRaw);
      } else {
        value = xmlDecode(valueRaw);
      }
      cells[columnIndex(ref)] = value;
    }
    return cells;
  });
}

function firstWorksheetName(entries: ZipEntry[]) {
  const worksheets = entries
    .map((entry) => entry.name)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return worksheets[0] ?? null;
}

function parseDate(value: string) {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const key = `${year}-${month}-${day}`;
  return {
    key,
    date: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
  };
}

function parseTime(value: string, baseDateKey: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, hour, minute] = match;
  const [year, month, day] = baseDateKey.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, Number(hour), Number(minute)) -
      KST_OFFSET_MS,
  );
}

function parseMinutes(value: string) {
  const match = /^(\d{1,3}):(\d{2})$/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function parseNaverWorksCommuteWorkbook(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const sheetName = firstWorksheetName(entries);
  if (!sheetName) throw new Error("엑셀 시트를 찾지 못했습니다.");

  const sharedStrings = parseSharedStrings(
    readZipFile(buffer, entries, "xl/sharedStrings.xml"),
  );
  const sheetXml = readZipFile(buffer, entries, sheetName);
  if (!sheetXml) throw new Error("엑셀 시트를 읽지 못했습니다.");

  const rows = parseSheetRows(sheetXml, sharedStrings);
  const headers = rows[0]?.map(text) ?? [];
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headerIndex.has(header),
  );
  if (missingHeaders.length > 0) {
    throw new Error(`필수 컬럼이 없습니다: ${missingHeaders.join(", ")}`);
  }

  const get = (row: string[], header: (typeof REQUIRED_HEADERS)[number]) =>
    text(row[headerIndex.get(header) ?? -1]);

  return rows.slice(1).flatMap((row, index): ParsedCommuteRow[] => {
    const rowNumber = index + 2;
    const name = get(row, "이름");
    const loginId = get(row, "로그인 아이디").toLowerCase();
    const parsedDate = parseDate(get(row, "기준일"));
    if (!name || !parsedDate) return [];

    const checkInRaw = get(row, "출근");
    const checkOutRaw = get(row, "퇴근");
    return [
      {
        rowNumber,
        workStyle: get(row, "근무 방식"),
        name,
        loginId,
        department: get(row, "부서"),
        baseDate: parsedDate.date,
        baseDateKey: parsedDate.key,
        workType: get(row, "근무 구분"),
        schedule: get(row, "근무 일정"),
        checkInAt: parseTime(checkInRaw, parsedDate.key),
        checkOutAt: parseTime(checkOutRaw, parsedDate.key),
        checkInRaw,
        checkOutRaw,
        workLocation: get(row, "근무 위치"),
        breakMinutes: parseMinutes(get(row, "휴게")),
        offsiteMinutes: parseMinutes(get(row, "외부 근무")),
        absenceMinutes: parseMinutes(get(row, "부재")),
        late: Boolean(get(row, "지각")),
        earlyLeave: Boolean(get(row, "조퇴")),
        requiredWorkCompliant: get(row, "의무 근로 준수"),
        scheduleCompliant: get(row, "근무 일정 준수"),
        scheduleVariance: get(row, "근무 일정 대비 과부족"),
      },
    ];
  });
}
