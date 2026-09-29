// أدوات مشتركة بين الخادم والواجهة

/** توحيد النص العربي للبحث: إزالة التشكيل والتطويل وتوحيد الألف والهاء والياء */
export function normalizeAr(input: any): string {
  if (input == null) return "";
  return String(input)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function formatFullDate(date?: string | null): string {
  if (!date) return "";
  const m = String(date).match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (!m) return String(date);
  const [, y, mo, d] = m;
  if (mo && d) return `${Number(d)} ${AR_MONTHS[Number(mo) - 1] ?? mo} ${y}`;
  if (mo) return `${AR_MONTHS[Number(mo) - 1] ?? mo} ${y}`;
  return y;
}

export interface DatedRow {
  year?: number | null;
  date?: string | null;
  dateCertainty?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
}

/** عرض التاريخ بأمانة: لا يخترع تاريخًا، ويوضح التقدير */
export function describeDate(r: DatedRow): { text: string; certainty: string; estimated: boolean } {
  const c = r.dateCertainty || (r.date || r.year ? "" : "unknown");
  if (r.date) return { text: formatFullDate(r.date), certainty: c || "", estimated: false };
  if (r.year) return { text: String(r.year), certainty: c || "", estimated: false };
  if (r.yearFrom && r.yearTo)
    return { text: `يرجح أنه بين ${r.yearFrom} و${r.yearTo}`, certainty: "uncertain", estimated: true };
  if (r.yearFrom) return { text: `يرجح أنه بعد ${r.yearFrom}`, certainty: "uncertain", estimated: true };
  if (r.yearTo) return { text: `يرجح أنه قبل ${r.yearTo}`, certainty: "uncertain", estimated: true };
  return { text: "التاريخ غير مؤكد", certainty: "unknown", estimated: false };
}

/** السنة الفعلية المستخدمة للترتيب والخط الزمني */
export function effectiveYear(r: DatedRow): number | null {
  if (r.year) return Number(r.year);
  if (r.date) {
    const y = parseInt(String(r.date).slice(0, 4), 10);
    if (!isNaN(y)) return y;
  }
  return null;
}

// ---------------- CSV ----------------
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!clean.length) return [];
  const header = clean[0].map((h) => h.trim());
  return clean.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
}

export function toCSV(rows: Record<string, any>[], columns: string[]): string {
  const esc = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}

export function decadeOf(year?: number | null): number | null {
  return year ? Math.floor(year / 10) * 10 : null;
}
