import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import type { Server } from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { ENTITIES, ENTITY_KEYS, EntityKey } from "@shared/registry";
import { parseCSV, toCSV, effectiveYear, normalizeAr } from "@shared/util";
import {
  db,
  DATA_DIR,
  MEDIA_DIR,
  AUDIO_DIR,
  IMAGE_DIR,
  BACKUP_DIR,
  DB_PATH,
  migrate,
  isEntity,
  getById,
  expand,
  sanitize,
  insertRow,
  updateRow,
  deleteRow,
  searchIds,
  reindexAll,
  getSettings,
  setSetting,
} from "./db";
import { seedIfEmpty } from "./seed";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "halim1929";
const SECRET = process.env.ADMIN_SECRET || "halim-archive-secret";
const TOKEN = crypto.createHash("sha256").update(ADMIN_PASSWORD + SECRET).digest("hex");

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const t = (req.headers["x-admin-token"] as string) || (req.query.token as string);
  if (t && t === TOKEN) return next();
  res.status(401).json({ message: "غير مصرح" });
}

const asInt = (v: any) => (v == null || v === "" ? null : Number(v));

// ------------------------------------------------------------------
// بناء استعلام القوائم مع الفلاتر
// ------------------------------------------------------------------
function listQuery(entity: EntityKey, q: any) {
  const def = ENTITIES[entity];
  const where: string[] = [];
  const params: any[] = [];

  // فلاتر مطابقة لحقول السجل
  for (const f of def.fields) {
    const v = q[f.key];
    if (v == null || v === "") continue;
    if (f.type === "tags") {
      where.push(`"${f.key}" LIKE ?`);
      params.push(`%"${v}"%`);
    } else if (f.type === "bool") {
      where.push(`COALESCE("${f.key}",0) = ?`);
      params.push(v === "1" || v === "true" ? 1 : 0);
    } else {
      where.push(`"${f.key}" = ?`);
      params.push(v);
    }
  }
  const yearExpr = def.dated ? `COALESCE(year, CAST(substr(date,1,4) AS INTEGER))` : "NULL";
  if (def.dated) {
    if (q.decade) {
      where.push(`${yearExpr} BETWEEN ? AND ?`);
      params.push(Number(q.decade), Number(q.decade) + 9);
    }
    if (q.undated === "1") where.push(`${yearExpr} IS NULL`);
  }
  if (entity === "songs") {
    if (q.recType) {
      where.push(`EXISTS (SELECT 1 FROM recordings r WHERE r.song = songs.id AND r.recordingType = ?)`);
      params.push(q.recType);
    }
    if (q.rare === "1") where.push(`EXISTS (SELECT 1 FROM recordings r WHERE r.song = songs.id AND r.isRare = 1)`);
    if (q.hasAudio === "1") where.push(`EXISTS (SELECT 1 FROM recordings r WHERE r.song = songs.id AND r.audioFile IS NOT NULL AND r.audioFile != '')`);
    if (q.concertId) {
      where.push(`EXISTS (SELECT 1 FROM recordings r WHERE r.song = songs.id AND r.concert = ?)`);
      params.push(q.concertId);
    }
  }
  if (entity === "recordings" && q.hasAudio === "1") where.push(`audioFile IS NOT NULL AND audioFile != ''`);
  if (q.q) {
    const hits = searchIds(String(q.q), entity, 5000).map((h) => h.entityId);
    if (!hits.length) where.push("0");
    else where.push(`id IN (${hits.join(",")})`);
  }

  const order = String(q.order || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
  const sortKey = String(q.sort || (def.dated ? "year" : def.display));
  let orderBy: string;
  if (sortKey === "year" && def.dated) orderBy = `(${yearExpr} IS NULL), ${yearExpr} ${order}, date ${order}, id ${order}`;
  else if (sortKey === "date" && def.dated) orderBy = `(date IS NULL), date ${order}, ${yearExpr} ${order}`;
  else if (sortKey === "recent") orderBy = `id DESC`;
  else if (sortKey === "orderInEvent") orderBy = `COALESCE(orderInEvent, 9999) ${order}, id`;
  else {
    const f = def.fields.find((x) => x.key === sortKey);
    if (f?.type === "ref") {
      const t = ENTITIES[f.ref!];
      orderBy = `(SELECT "${t.display}" FROM "${f.ref}" WHERE id = "${entity}"."${f.key}") IS NULL, (SELECT "${t.display}" FROM "${f.ref}" WHERE id = "${entity}"."${f.key}") ${order}`;
    } else if (f) orderBy = `("${f.key}" IS NULL OR "${f.key}" = ''), "${f.key}" ${order}`;
    else orderBy = `id ${order}`;
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { w, params, orderBy };
}

function enrichSongs(rows: any[]) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const recs = db
    .prepare(
      `SELECT id, song, title, recordingType, audioFile, duration, image, year, concert FROM recordings WHERE song IN (${ids.map(() => "?").join(",")}) ORDER BY COALESCE(year, 9999), id`,
    )
    .all(...ids) as any[];
  for (const r of rows) {
    const mine = recs.filter((x) => x.song === r.id);
    r.recordingsCount = mine.length;
    r.audioCount = mine.filter((x) => x.audioFile).length;
    r.recordingTypes = Array.from(new Set(mine.map((x) => x.recordingType).filter(Boolean)));
    const playable = mine.find((x) => x.audioFile);
    r.playable = playable ? { id: playable.id, audioFile: playable.audioFile, duration: playable.duration, title: playable.title, image: playable.image } : null;
  }
  return rows;
}

function listItems(entity: EntityKey, q: any) {
  const { w, params, orderBy } = listQuery(entity, q);
  const limit = Math.min(Number(q.limit) || 24, 500);
  const offset = Number(q.offset) || 0;
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM "${entity}" ${w}`).get(...params) as any).c;
  let items = db.prepare(`SELECT * FROM "${entity}" ${w} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset) as any[];
  items = expand(entity, items);
  if (entity === "songs") enrichSongs(items);
  if (entity === "recordings") attachSongInfo(items);
  if (entity === "concerts" || entity === "sessions") {
    const col = entity === "concerts" ? "concert" : "session";
    for (const it of items) {
      const c = db.prepare(`SELECT COUNT(*) c, SUM(CASE WHEN audioFile IS NOT NULL AND audioFile != '' THEN 1 ELSE 0 END) a FROM recordings WHERE "${col}" = ?`).get(it.id) as any;
      it.songsCount = c.c;
      it.audioCount = c.a || 0;
    }
  }
  if (entity === "people") {
    for (const it of items) {
      it.worksCount = (db.prepare(`SELECT COUNT(*) c FROM songs WHERE composer = ? OR lyricist = ? OR arranger = ?`).get(it.id, it.id, it.id) as any).c;
    }
  }
  return { items, total, limit, offset };
}

function attachSongInfo(recs: any[]) {
  const ids = Array.from(new Set(recs.map((r) => r.song).filter(Boolean)));
  if (!ids.length) return recs;
  const songs = expand("songs", db.prepare(`SELECT * FROM songs WHERE id IN (${ids.map(() => "?").join(",")})`).all(...ids) as any[]);
  const m = new Map(songs.map((s) => [s.id, s]));
  for (const r of recs) {
    const s = m.get(r.song);
    if (s) r.songInfo = { id: s.id, title: s.title, composerName: s.composerName, lyricistName: s.lyricistName, image: s.image, category: s.category };
  }
  return recs;
}

function citationsFor(entity: string, id: number) {
  const rows = db.prepare(`SELECT * FROM citations WHERE entityType = ? AND entityId = ? ORDER BY id`).all(entity, id) as any[];
  const ex = expand("citations", rows);
  for (const c of ex) if (c.source) c.sourceInfo = getById("sources", c.source);
  return ex;
}

const photoCol: Partial<Record<EntityKey, string>> = {
  concerts: "concert",
  sessions: "session",
  interviews: "interview",
  movies: "movie",
  songs: "song",
  people: "person",
};

function detail(entity: EntityKey, id: number) {
  const row = getById(entity, id);
  if (!row) return null;
  const [item] = expand(entity, [row]);
  const out: any = { item, citations: citationsFor(entity, id), related: {} };
  const R = out.related;
  const recs = (where: string, ...p: any[]) =>
    attachSongInfo(expand("recordings", db.prepare(`SELECT * FROM recordings WHERE ${where}`).all(...p) as any[]));

  if (photoCol[entity]) {
    R.photos = expand("photos", db.prepare(`SELECT * FROM photos WHERE "${photoCol[entity]}" = ? ORDER BY COALESCE(year, 9999), id`).all(id) as any[]);
  }
  switch (entity) {
    case "songs":
      R.recordings = recs(`song = ? ORDER BY COALESCE(year, CAST(substr(date,1,4) AS INTEGER), 9999), id`, id);
      R.events = expand("events", db.prepare(`SELECT * FROM events WHERE song = ?`).all(id) as any[]);
      break;
    case "recordings":
      if (item.song) {
        const [s] = expand("songs", [getById("songs", item.song)].filter(Boolean));
        R.song = s;
        R.siblings = recs(`song = ? AND id != ? ORDER BY COALESCE(year, 9999), id`, item.song, id);
      }
      attachSongInfo([item]);
      break;
    case "concerts":
      R.recordings = recs(`concert = ? ORDER BY COALESCE(orderInEvent, 9999), id`, id);
      break;
    case "sessions":
      R.recordings = recs(`session = ? ORDER BY COALESCE(orderInEvent, 9999), id`, id);
      break;
    case "movies":
      R.songs = enrichSongs(expand("songs", db.prepare(`SELECT * FROM songs WHERE movie = ? ORDER BY title`).all(id) as any[]));
      R.recordings = recs(`movie = ? ORDER BY id`, id);
      break;
    case "people": {
      R.songs = enrichSongs(
        expand("songs", db.prepare(`SELECT * FROM songs WHERE composer = ? OR lyricist = ? OR arranger = ? ORDER BY COALESCE(year, 9999), title`).all(id, id, id) as any[]),
      );
      const songIds = R.songs.map((s: any) => s.id);
      R.recordings = songIds.length
        ? recs(`(song IN (${songIds.join(",")}) OR arranger = ?) ORDER BY COALESCE(year, 9999), id`, id)
        : recs(`arranger = ? ORDER BY id`, id);
      const concertIds = Array.from(new Set(R.recordings.map((r: any) => r.concert).filter(Boolean)));
      R.concerts = concertIds.length ? expand("concerts", db.prepare(`SELECT * FROM concerts WHERE id IN (${concertIds.join(",")}) ORDER BY year`).all() as any[]) : [];
      const years = new Set<number>();
      [...R.songs, ...R.recordings].forEach((x: any) => {
        const y = effectiveYear(x);
        if (y) years.add(y);
      });
      R.years = Array.from(years).sort((a, b) => a - b);
      break;
    }
    case "events":
      if (item.song) R.song = getById("songs", item.song);
      if (item.movie) R.movie = getById("movies", item.movie);
      if (item.concert) R.concert = getById("concerts", item.concert);
      break;
  }
  return out;
}

// ------------------------------------------------------------------
// الخط الزمني
// ------------------------------------------------------------------
const TIMELINE_ENTITIES: EntityKey[] = ["events", "songs", "recordings", "concerts", "sessions", "interviews", "movies", "photos"];

function timelineYears() {
  const years = new Map<number, Record<string, number>>();
  for (const e of TIMELINE_ENTITIES) {
    const rows = db.prepare(`SELECT COALESCE(year, CAST(substr(date,1,4) AS INTEGER)) AS y, COUNT(*) c FROM "${e}" WHERE y IS NOT NULL GROUP BY y`).all() as any[];
    for (const r of rows) {
      if (!r.y) continue;
      const m = years.get(r.y) ?? {};
      m[e] = r.c;
      years.set(r.y, m);
    }
  }
  const milestones = expand("events", db.prepare(`SELECT * FROM events WHERE milestone = 1 ORDER BY COALESCE(year, CAST(substr(date,1,4) AS INTEGER)), date`).all() as any[]);
  return {
    years: Array.from(years.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, counts]) => ({ year, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) })),
    milestones,
  };
}

function timelineYear(year: number) {
  const out: any = { year, items: {}, estimated: {} };
  for (const e of TIMELINE_ENTITIES) {
    let rows = db.prepare(`SELECT * FROM "${e}" WHERE COALESCE(year, CAST(substr(date,1,4) AS INTEGER)) = ? ORDER BY date, id`).all(year) as any[];
    rows = expand(e, rows);
    if (e === "songs") enrichSongs(rows);
    if (e === "recordings") attachSongInfo(rows);
    if (rows.length) out.items[e] = rows;
    let est = db
      .prepare(`SELECT * FROM "${e}" WHERE year IS NULL AND date IS NULL AND yearFrom IS NOT NULL AND yearFrom <= ? AND COALESCE(yearTo, yearFrom) >= ?`)
      .all(year, year) as any[];
    est = expand(e, est);
    if (e === "recordings") attachSongInfo(est);
    if (est.length) out.estimated[e] = est;
  }
  return out;
}

// ------------------------------------------------------------------
// رفع الملفات
// ------------------------------------------------------------------
function safeName(original: string) {
  const ext = path.extname(original).toLowerCase();
  const base = path
    .basename(original, path.extname(original))
    .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "file";
  return { base, ext };
}

function safeFolder(f: any) {
  return String(f || "")
    .split("/")
    .map((p) => p.replace(/[^\p{L}\p{N}\-_]/gu, ""))
    .filter(Boolean)
    .join("/");
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const kind = req.query.kind === "image" ? IMAGE_DIR : AUDIO_DIR;
      const dir = path.join(kind, safeFolder(req.query.folder));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // multer يقرأ الأسماء كـ latin1
      const orig = Buffer.from(file.originalname, "latin1").toString("utf8");
      const { base, ext } = safeName(orig);
      const kind = req.query.kind === "image" ? IMAGE_DIR : AUDIO_DIR;
      const dir = path.join(kind, safeFolder(req.query.folder));
      let name = `${base}${ext}`;
      let i = 1;
      while (fs.existsSync(path.join(dir, name))) name = `${base}-${i++}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = req.query.kind === "image" ? /^image\//.test(file.mimetype) : /^audio\//.test(file.mimetype) || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(file.originalname);
    cb(null, ok);
  },
});

function walk(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else if (!e.name.startsWith(".")) out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

function linkedMedia(): Set<string> {
  const s = new Set<string>();
  for (const e of ENTITY_KEYS) {
    for (const f of ENTITIES[e].fields.filter((f) => f.type === "audio" || f.type === "image")) {
      (db.prepare(`SELECT "${f.key}" AS v FROM "${e}" WHERE "${f.key}" IS NOT NULL AND "${f.key}" != ''`).all() as any[]).forEach((r) => s.add(r.v));
    }
  }
  const hero = getSettings().heroImage;
  if (hero) s.add(hero);
  return s;
}

// ------------------------------------------------------------------
// الاستيراد
// ------------------------------------------------------------------
function importRows(entity: EntityKey, rows: any[]) {
  let inserted = 0,
    updated = 0;
  const errors: string[] = [];
  const def = ENTITIES[entity];
  const tx = db.transaction(() => {
    rows.forEach((raw, i) => {
      try {
        const data = sanitize(entity, raw, { resolveNames: true });
        const missing = def.fields.filter((f) => f.required && (data[f.key] == null || data[f.key] === ""));
        if (missing.length) throw new Error(`حقل مطلوب ناقص: ${missing.map((m) => m.key).join(", ")}`);
        const id = raw.id && /^\d+$/.test(String(raw.id)) ? Number(raw.id) : null;
        if (id && getById(entity, id)) {
          updateRow(entity, id, data);
          updated++;
        } else {
          insertRow(entity, id ? { id, ...data } : data);
          inserted++;
        }
      } catch (e: any) {
        errors.push(`سطر ${i + 2}: ${e.message}`);
      }
    });
  });
  tx();
  reindexAll();
  return { inserted, updated, errors: errors.slice(0, 50), errorCount: errors.length };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  migrate();
  seedIfEmpty();

  app.use(express.json({ limit: "200mb" }));

  // ملفات الوسائط — تُحمّل عند الطلب فقط، مع دعم Range للتشغيل التدريجي
  app.use(
    "/media",
    (_req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      next();
    },
    express.static(MEDIA_DIR, { maxAge: "30d", acceptRanges: true, fallthrough: false }),
  );

  app.get("/api/health", (_req, res) => res.json({ ok: true, dataDir: DATA_DIR }));

  app.get("/api/stats", (_req, res) => {
    const counts: Record<string, number> = {};
    for (const e of ENTITY_KEYS) counts[e] = (db.prepare(`SELECT COUNT(*) c FROM "${e}"`).get() as any).c;
    counts.audio = (db.prepare(`SELECT COUNT(*) c FROM recordings WHERE audioFile IS NOT NULL AND audioFile != ''`).get() as any).c;
    const decades = db
      .prepare(`SELECT (COALESCE(year, CAST(substr(date,1,4) AS INTEGER))/10)*10 AS d, COUNT(*) c FROM songs WHERE d IS NOT NULL GROUP BY d ORDER BY d`)
      .all();
    res.json({ counts, decades, settings: getSettings() });
  });

  app.get("/api/list/:entity", (req, res) => {
    const e = req.params.entity;
    if (!isEntity(e)) return res.status(404).json({ message: "not found" });
    res.json(listItems(e, req.query));
  });

  app.get("/api/item/:entity/:id", (req, res) => {
    const e = req.params.entity;
    if (!isEntity(e)) return res.status(404).json({ message: "not found" });
    const d = detail(e, Number(req.params.id));
    if (!d) return res.status(404).json({ message: "not found" });
    res.json(d);
  });

  app.get("/api/facets", (_req, res) => {
    const people = (role: string) =>
      db.prepare(`SELECT DISTINCT p.id, p.name FROM people p JOIN songs s ON s."${role}" = p.id ORDER BY p.name`).all();
    res.json({
      composers: people("composer"),
      lyricists: people("lyricist"),
      arrangers: people("arranger"),
      movies: db.prepare(`SELECT id, title, year FROM movies ORDER BY year, title`).all(),
      concerts: db.prepare(`SELECT id, title, year FROM concerts ORDER BY year, title`).all(),
    });
  });

  app.get("/api/search", (req, res) => {
    const q = String(req.query.q || "");
    const per = Math.min(Number(req.query.per) || 8, 100);
    const hits = searchIds(q, undefined, 2000);
    const groups: Record<string, { total: number; items: any[] }> = {};
    for (const h of hits) {
      groups[h.entity] ??= { total: 0, items: [] };
      groups[h.entity].total++;
      if (groups[h.entity].items.length < per) groups[h.entity].items.push(h.entityId);
    }
    const out: any = {};
    for (const [e, g] of Object.entries(groups)) {
      const ids = g.items;
      let rows = db.prepare(`SELECT * FROM "${e}" WHERE id IN (${ids.map(() => "?").join(",")})`).all(...ids) as any[];
      rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      rows = expand(e as EntityKey, rows);
      if (e === "songs") enrichSongs(rows);
      if (e === "recordings") attachSongInfo(rows);
      out[e] = { total: g.total, items: rows };
    }
    const yearMatch = q.trim().match(/^(19\d{2}|20\d{2})$/);
    res.json({ q, total: hits.length, groups: out, year: yearMatch ? Number(yearMatch[1]) : null });
  });

  app.get("/api/timeline", (_req, res) => res.json(timelineYears()));
  app.get("/api/timeline/:year", (req, res) => res.json(timelineYear(Number(req.params.year))));

  // ------------------------------ الإدارة ------------------------------
  app.post("/api/admin/login", (req, res) => {
    if (req.body?.password === ADMIN_PASSWORD) return res.json({ token: TOKEN, defaultPassword: !process.env.ADMIN_PASSWORD });
    res.status(401).json({ message: "كلمة المرور غير صحيحة" });
  });

  app.get("/api/admin/info", requireAdmin, (_req, res) => {
    const size = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
    res.json({
      dataDir: DATA_DIR,
      dbPath: DB_PATH,
      dbSize: size,
      audioFiles: walk(AUDIO_DIR).length,
      imageFiles: walk(IMAGE_DIR).length,
      backups: fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db")).sort().reverse().slice(0, 20),
      defaultPassword: !process.env.ADMIN_PASSWORD,
    });
  });

  app.put("/api/admin/settings", requireAdmin, (req, res) => {
    for (const [k, v] of Object.entries(req.body || {})) setSetting(k, String(v ?? ""));
    res.json(getSettings());
  });

  app.post("/api/admin/upload", requireAdmin, upload.array("files", 500), (req, res) => {
    const kind = req.query.kind === "image" ? "images" : "audio";
    const base = kind === "images" ? IMAGE_DIR : AUDIO_DIR;
    const files = ((req.files as Express.Multer.File[]) || []).map((f) => ({
      path: `${kind}/${path.relative(base, f.path).split(path.sep).join("/")}`,
      name: f.filename,
      size: f.size,
    }));
    res.json({ files });
  });

  app.get("/api/admin/files", requireAdmin, (req, res) => {
    const kind = req.query.kind === "image" ? "images" : "audio";
    const base = kind === "images" ? IMAGE_DIR : AUDIO_DIR;
    const linked = linkedMedia();
    const all = walk(base).map((p) => `${kind}/${p}`);
    const filter = normalizeAr(req.query.q || "");
    const list = all
      .filter((p) => !filter || normalizeAr(p).includes(filter))
      .map((p) => ({ path: p, linked: linked.has(p) }))
      .filter((f) => req.query.unlinked !== "1" || !f.linked);
    res.json({ total: all.length, files: list.slice(0, 1000) });
  });

  app.post("/api/admin/import", requireAdmin, (req, res) => {
    const { entity, format, content } = req.body || {};
    try {
      if (format === "json") {
        const data = JSON.parse(content);
        // صيغة النسخة الكاملة: { songs: [...], people: [...] }
        if (!Array.isArray(data) && typeof data === "object" && !entity) {
          const results: any = {};
          const orderKeys: EntityKey[] = ["sources", "people", "movies", "concerts", "sessions", "interviews", "songs", "recordings", "photos", "events", "citations"];
          for (const k of orderKeys) if (Array.isArray(data.data?.[k] ?? data[k])) results[k] = importRows(k, data.data?.[k] ?? data[k]);
          if (data.settings) for (const [k, v] of Object.entries(data.settings)) setSetting(k, String(v));
          return res.json({ multi: true, results });
        }
        if (!isEntity(entity)) return res.status(400).json({ message: "اختر نوع البيانات" });
        return res.json(importRows(entity, Array.isArray(data) ? data : data[entity] || []));
      }
      if (!isEntity(entity)) return res.status(400).json({ message: "اختر نوع البيانات" });
      return res.json(importRows(entity, parseCSV(String(content || ""))));
    } catch (e: any) {
      res.status(400).json({ message: `تعذر قراءة الملف: ${e.message}` });
    }
  });

  app.get("/api/admin/template/:entity", requireAdmin, (req, res) => {
    const e = req.params.entity;
    if (!isEntity(e)) return res.status(404).end();
    const cols = ["id", ...ENTITIES[e].fields.map((f) => f.key)];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="template-${e}.csv"`);
    res.send(toCSV([], cols));
  });

  app.get("/api/admin/export/:entity", requireAdmin, (req, res) => {
    const e = req.params.entity;
    if (e === "all") {
      const data: any = {};
      for (const k of ENTITY_KEYS) data[k] = db.prepare(`SELECT * FROM "${k}" ORDER BY id`).all();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="halim-archive-${new Date().toISOString().slice(0, 10)}.json"`);
      return res.send(JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, settings: getSettings(), data }, null, 2));
    }
    if (!isEntity(e)) return res.status(404).end();
    const rows = db.prepare(`SELECT * FROM "${e}" ORDER BY id`).all() as any[];
    const cols = ["id", ...ENTITIES[e].fields.map((f) => f.key)];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${e}.csv"`);
    res.send(toCSV(rows, cols));
  });

  app.post("/api/admin/backup", requireAdmin, async (_req, res) => {
    const name = `archive-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
    await db.backup(path.join(BACKUP_DIR, name));
    res.json({ name });
  });

  app.get("/api/admin/backup-file/:name", requireAdmin, (req, res) => {
    const name = path.basename(req.params.name);
    const p = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(p)) return res.status(404).end();
    res.download(p, name);
  });

  app.post("/api/admin/reindex", requireAdmin, (_req, res) => {
    reindexAll();
    res.json({ ok: true });
  });

  app.post("/api/admin/:entity", requireAdmin, (req, res) => {
    const e = req.params.entity;
    if (!isEntity(e)) return res.status(404).json({ message: "not found" });
    const data = sanitize(e, req.body || {}, { resolveNames: true });
    const missing = ENTITIES[e].fields.filter((f) => f.required && (data[f.key] == null || data[f.key] === ""));
    if (missing.length) return res.status(400).json({ message: `الحقول المطلوبة: ${missing.map((m) => m.label.ar).join("، ")}` });
    res.json(expand(e, [insertRow(e, data)])[0]);
  });

  app.put("/api/admin/:entity/:id", requireAdmin, (req, res) => {
    const e = req.params.entity;
    if (!isEntity(e)) return res.status(404).json({ message: "not found" });
    const id = Number(req.params.id);
    if (!getById(e, id)) return res.status(404).json({ message: "not found" });
    const data = sanitize(e, req.body || {}, { resolveNames: true });
    res.json(expand(e, [updateRow(e, id, data)])[0]);
  });

  app.delete("/api/admin/:entity/:id", requireAdmin, (req, res) => {
    const e = req.params.entity;
    if (!isEntity(e)) return res.status(404).json({ message: "not found" });
    deleteRow(e, Number(req.params.id));
    res.json({ ok: true });
  });

  return httpServer;
}
