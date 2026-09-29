/**
 * طبقة البيانات
 * ------------------------------------------------------------
 * كل بيانات المستخدم (قاعدة البيانات + ملفات MP3 + الصور + النسخ الاحتياطية)
 * تُحفظ في مجلد منفصل تمامًا عن كود التطبيق:
 *
 *   ARCHIVE_DATA_DIR  (الافتراضي: ./archive-data)
 *   ├── archive.db          قاعدة البيانات SQLite
 *   ├── media/
 *   │   ├── audio/          ملفات MP3
 *   │   └── images/         الصور
 *   └── backups/            النسخ الاحتياطية
 *
 * إعادة البناء (Build) أو النشر (Deploy) لا تلمس هذا المجلد أبدًا.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ENTITIES, ENTITY_KEYS, EntityKey, FieldDef, optionLabel, OPTION_SETS } from "@shared/registry";
import { normalizeAr, effectiveYear } from "@shared/util";

export const DATA_DIR = path.resolve(process.env.ARCHIVE_DATA_DIR || path.join(process.cwd(), "archive-data"));
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const AUDIO_DIR = path.join(MEDIA_DIR, "audio");
export const IMAGE_DIR = path.join(MEDIA_DIR, "images");
export const BACKUP_DIR = path.join(DATA_DIR, "backups");
for (const d of [DATA_DIR, MEDIA_DIR, AUDIO_DIR, IMAGE_DIR, BACKUP_DIR]) fs.mkdirSync(d, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, "archive.db");
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

const sqlType = (f: FieldDef) => (f.type === "number" || f.type === "ref" || f.type === "bool" ? "INTEGER" : "TEXT");

/** إنشاء الجداول وإضافة الأعمدة الجديدة فقط — لا يحذف أي شيء أبدًا */
export function migrate() {
  for (const key of ENTITY_KEYS) {
    const def = ENTITIES[key];
    db.exec(`CREATE TABLE IF NOT EXISTS "${key}" (id INTEGER PRIMARY KEY AUTOINCREMENT, createdAt TEXT, updatedAt TEXT)`);
    const existing = new Set((db.prepare(`PRAGMA table_info("${key}")`).all() as any[]).map((c) => c.name));
    for (const f of def.fields) {
      if (!existing.has(f.key)) db.exec(`ALTER TABLE "${key}" ADD COLUMN "${f.key}" ${sqlType(f)}`);
    }
    if (def.dated) db.exec(`CREATE INDEX IF NOT EXISTS "idx_${key}_year" ON "${key}"(year)`);
    for (const f of def.fields.filter((f) => f.type === "ref"))
      db.exec(`CREATE INDEX IF NOT EXISTS "idx_${key}_${f.key}" ON "${key}"("${f.key}")`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_citations_entity ON citations(entityType, entityId)`);
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);
  db.exec(
    `CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(entity UNINDEXED, entityId UNINDEXED, year UNINDEXED, title, body, tokenize='trigram')`,
  );
}

// ---------------------------------------------------------------
// أدوات عامة
// ---------------------------------------------------------------
export function isEntity(k: string): k is EntityKey {
  return (ENTITY_KEYS as string[]).includes(k);
}

export function getById(entity: EntityKey, id: number): any {
  return db.prepare(`SELECT * FROM "${entity}" WHERE id = ?`).get(id);
}

const nameCache = new Map<string, string>();
export function displayName(entity: EntityKey, id: any): string {
  if (!id) return "";
  const def = ENTITIES[entity];
  const row: any = db.prepare(`SELECT "${def.display}" AS n FROM "${entity}" WHERE id = ?`).get(id);
  return row?.n ?? "";
}

/** يضيف أسماء العناصر المرتبطة (مثل اسم الملحن) إلى النتائج */
export function expand(entity: EntityKey, rows: any[]): any[] {
  const def = ENTITIES[entity];
  const refs = def.fields.filter((f) => f.type === "ref");
  if (!rows.length) return rows;
  for (const f of refs) {
    const ids = Array.from(new Set(rows.map((r) => r[f.key]).filter(Boolean)));
    if (!ids.length) continue;
    const target = ENTITIES[f.ref!];
    const found = db
      .prepare(`SELECT id, "${target.display}" AS n FROM "${f.ref}" WHERE id IN (${ids.map(() => "?").join(",")})`)
      .all(...ids) as any[];
    const m = new Map(found.map((x) => [x.id, x.n]));
    for (const r of rows) if (r[f.key]) r[`${f.key}Name`] = m.get(r[f.key]) ?? "";
  }
  for (const f of def.fields.filter((f) => f.type === "tags")) {
    for (const r of rows) {
      try {
        r[f.key] = r[f.key] ? JSON.parse(r[f.key]) : [];
      } catch {
        r[f.key] = String(r[f.key]).split(/[,،]/).map((s: string) => s.trim()).filter(Boolean);
      }
    }
  }
  for (const f of def.fields.filter((f) => f.type === "bool")) for (const r of rows) r[f.key] = !!r[f.key];
  return rows;
}

/** تنظيف المدخلات حسب نوع الحقل */
// يقبل القيمة الإنجليزية (romantic) أو التسمية العربية (أغنية عاطفية) في الاستيراد
function optionValue(set: any, v: string): string {
  const opts: any[] = (OPTION_SETS as any)[set] ?? [];
  const t = v.trim();
  const hit = opts.find((o) => o.value === t || o.label.ar === t || o.label.en?.toLowerCase() === t.toLowerCase());
  return hit ? hit.value : t;
}

export function sanitize(entity: EntityKey, input: any, opts: { resolveNames?: boolean } = {}): any {
  const def = ENTITIES[entity];
  const out: any = {};
  for (const f of def.fields) {
    let v = input[f.key];
    // دعم أعمدة الاستيراد مثل composerName
    if ((v === undefined || v === "") && f.type === "ref" && input[`${f.key}Name`]) v = input[`${f.key}Name`];
    if (v === undefined) continue;
    if (v === "" || v === null) {
      out[f.key] = null;
      continue;
    }
    switch (f.type) {
      case "number": {
        const n = Number(String(v).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
        out[f.key] = isNaN(n) ? null : n;
        break;
      }
      case "bool":
        out[f.key] = v === true || v === 1 || v === "1" || v === "true" || v === "نعم" ? 1 : 0;
        break;
      case "ref": {
        if (typeof v === "number" || /^\d+$/.test(String(v))) out[f.key] = Number(v);
        else if (opts.resolveNames) out[f.key] = findOrCreateByName(f.ref!, String(v));
        else out[f.key] = null;
        break;
      }
      case "select":
        out[f.key] = optionValue(f.options, String(v));
        break;
      case "tags": {
        const arr = (Array.isArray(v) ? v : String(v).split(/[,،|]/).map((s) => s.trim()).filter(Boolean)).map((x: string) => optionValue(f.options, x));
        out[f.key] = JSON.stringify(arr);
        break;
      }
      default:
        out[f.key] = String(v);
    }
  }
  return out;
}

export function findOrCreateByName(entity: EntityKey, name: string): number | null {
  const n = name.trim();
  if (!n) return null;
  const def = ENTITIES[entity];
  const all = db.prepare(`SELECT id, "${def.display}" AS n FROM "${entity}"`).all() as any[];
  const norm = normalizeAr(n);
  const hit = all.find((r) => normalizeAr(r.n) === norm);
  if (hit) return hit.id;
  const now = new Date().toISOString();
  const res = db.prepare(`INSERT INTO "${entity}" ("${def.display}", createdAt, updatedAt) VALUES (?, ?, ?)`).run(n, now, now);
  indexRow(entity, Number(res.lastInsertRowid));
  return Number(res.lastInsertRowid);
}

export function insertRow(entity: EntityKey, data: any): any {
  const now = new Date().toISOString();
  const row = { ...data, createdAt: now, updatedAt: now };
  const keys = Object.keys(row);
  const res = db
    .prepare(`INSERT INTO "${entity}" (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`)
    .run(...keys.map((k) => row[k]));
  const id = Number(res.lastInsertRowid);
  afterWrite(entity, id);
  return getById(entity, id);
}

export function updateRow(entity: EntityKey, id: number, data: any): any {
  const row = { ...data, updatedAt: new Date().toISOString() };
  const keys = Object.keys(row);
  db.prepare(`UPDATE "${entity}" SET ${keys.map((k) => `"${k}" = ?`).join(",")} WHERE id = ?`).run(...keys.map((k) => row[k]), id);
  afterWrite(entity, id);
  return getById(entity, id);
}

export function deleteRow(entity: EntityKey, id: number) {
  db.prepare(`DELETE FROM "${entity}" WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM search_index WHERE entity = ? AND entityId = ?`).run(entity, id);
  if (entity !== "citations") db.prepare(`DELETE FROM citations WHERE entityType = ? AND entityId = ?`).run(entity, id);
  scheduleReindex();
}

// ---------------------------------------------------------------
// فهرس البحث (FTS5 trigram مع توحيد الحروف العربية)
// ---------------------------------------------------------------
function docFor(entity: EntityKey, row: any): { title: string; body: string; year: number | null } {
  const def = ENTITIES[entity];
  const parts: string[] = [];
  for (const f of def.fields) {
    const v = row[f.key];
    if (v == null || v === "") continue;
    if (f.type === "ref") parts.push(displayName(f.ref!, v));
    else if (f.type === "select") parts.push(optionLabel(f.options, v));
    else if (f.type === "tags") {
      try {
        (JSON.parse(v) as string[]).forEach((x) => parts.push(optionLabel(f.options, x)));
      } catch {}
    } else if (f.type === "audio" || f.type === "image" || f.type === "bool") continue;
    else parts.push(String(v));
  }
  // إثراء: الحفلة/الجلسة/الفيلم تشمل أسماء أغانيها
  if (entity === "concerts" || entity === "sessions" || entity === "movies") {
    const col = entity === "concerts" ? "concert" : entity === "sessions" ? "session" : "movie";
    const titles = db
      .prepare(`SELECT s.title AS t FROM recordings r JOIN songs s ON s.id = r.song WHERE r."${col}" = ?`)
      .all(row.id) as any[];
    titles.forEach((t) => parts.push(t.t));
    if (entity === "movies") {
      (db.prepare(`SELECT title AS t FROM songs WHERE movie = ?`).all(row.id) as any[]).forEach((t) => parts.push(t.t));
    }
  }
  if (entity === "recordings" && row.song) {
    const s: any = getById("songs", row.song);
    if (s) {
      parts.push(s.title, s.altTitles ?? "", s.lyrics ?? "");
      if (s.composer) parts.push(displayName("people", s.composer));
      if (s.lyricist) parts.push(displayName("people", s.lyricist));
    }
  }
  const title = entity === "recordings" ? `${displayName("songs", row.song)} ${row.title ?? ""}` : String(row[def.display] ?? "");
  let year = def.dated ? effectiveYear(row) : null;
  if (entity === "people") year = null;
  if (year) parts.push(String(year));
  if (row.yearFrom) parts.push(String(row.yearFrom));
  if (row.yearTo) parts.push(String(row.yearTo));
  return { title: normalizeAr(title), body: normalizeAr(parts.join(" ")), year };
}

export function indexRow(entity: EntityKey, id: number) {
  if (entity === "citations") return;
  db.prepare(`DELETE FROM search_index WHERE entity = ? AND entityId = ?`).run(entity, id);
  const row = getById(entity, id);
  if (!row) return;
  const d = docFor(entity, row);
  db.prepare(`INSERT INTO search_index (entity, entityId, year, title, body) VALUES (?, ?, ?, ?, ?)`).run(entity, id, d.year, d.title, d.body);
}

export function reindexAll() {
  const tx = db.transaction(() => {
    db.exec(`DELETE FROM search_index`);
    for (const e of ENTITY_KEYS) {
      if (e === "citations") continue;
      const ids = db.prepare(`SELECT id FROM "${e}"`).all() as any[];
      for (const { id } of ids) indexRow(e, id);
    }
  });
  tx();
}

let reindexTimer: NodeJS.Timeout | null = null;
export function scheduleReindex() {
  if (reindexTimer) clearTimeout(reindexTimer);
  reindexTimer = setTimeout(() => {
    reindexTimer = null;
    try {
      reindexAll();
    } catch (e) {
      console.error("reindex failed", e);
    }
  }, 400);
}

function afterWrite(entity: EntityKey, id: number) {
  indexRow(entity, id);
  // العناصر المرتبطة قد تحتاج إعادة فهرسة (مثلا تغيير اسم ملحن)
  if (entity !== "citations") scheduleReindex();
}

/** بحث نصي؛ يعيد [entity, entityId, year] */
export function searchIds(q: string, entity?: EntityKey, limit = 500): { entity: EntityKey; entityId: number; year: number | null }[] {
  const nq = normalizeAr(q);
  if (!nq) return [];
  const tokens = nq.split(" ").filter(Boolean);
  const long = tokens.filter((t) => t.length >= 3);
  const short = tokens.filter((t) => t.length < 3);
  const where: string[] = [];
  const params: any[] = [];
  if (long.length) {
    where.push(`search_index MATCH ?`);
    params.push(long.map((t) => `"${t.replace(/"/g, "")}"`).join(" AND "));
  }
  for (const s of short) {
    where.push(`(title || ' ' || body) LIKE ?`);
    params.push(`%${s}%`);
  }
  if (entity) {
    where.push(`entity = ?`);
    params.push(entity);
  }
  // الأولوية لتطابق العنوان
  const rows = db
    .prepare(
      `SELECT entity, entityId, year, (CASE WHEN title LIKE ? THEN 0 ELSE 1 END) AS pri FROM search_index WHERE ${where.join(" AND ")} ORDER BY pri, year LIMIT ?`,
    )
    .all(`%${nq}%`, ...params, limit) as any[];
  return rows.map((r) => ({ entity: r.entity, entityId: Number(r.entityId), year: r.year }));
}

// ---------------------------------------------------------------
// الإعدادات
// ---------------------------------------------------------------
export function getSettings(): Record<string, string> {
  const rows = db.prepare(`SELECT key, value FROM settings`).all() as any[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
export function setSetting(key: string, value: string) {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}
export function getMeta(key: string) {
  return (db.prepare(`SELECT value FROM meta WHERE key = ?`).get(key) as any)?.value;
}
export function setMeta(key: string, value: string) {
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}
