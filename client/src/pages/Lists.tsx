import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDownUp, MapPin, Mic2, Radio, Disc3, Film, ArrowLeft } from "lucide-react";
import { useApi, useInfiniteList, mediaUrl, qs } from "@/lib/api";
import { Container, useDebounced, entityHref, entityTitle, LiveSearch } from "@/components/Layout";
import { PageHeader, Chip, InfiniteSentinel, CardSkeleton, EmptyState, DateText, Cover, RecordingRow, SongCard, Spinner, Section } from "@/components/common";
import { Lightbox } from "@/components/Lightbox";
import { OPTION_SETS, ENTITIES, EntityKey, optionLabel } from "@shared/registry";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function OrderToggle({ order, setOrder }: { order: "asc" | "desc"; setOrder: (o: "asc" | "desc") => void }) {
  return (
    <button onClick={() => setOrder(order === "asc" ? "desc" : "asc")} className="flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-accent" data-testid="button-order">
      <ArrowDownUp className="h-4 w-4" /> {order === "asc" ? t("oldestFirst") : t("newestFirst")}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary/70 md:max-w-sm" data-testid="input-list-search" />
  );
}

// ================================================================
// قائمة زمنية عامة: الحفلات / الجلسات / المقابلات
// ================================================================
const EVENT_CFG: Record<string, { title: string; eyebrow: string; intro: string; icon: any; sub: (r: any) => string }> = {
  concerts: { title: "حفلات عبد الحليم حافظ", eyebrow: "على المسرح", intro: "مرتبة حسب التاريخ. كل حفلة تضم قائمة الأغاني والتسجيلات المتوفرة منها.", icon: Mic2, sub: (r) => [r.occasion, r.venue, r.city, r.country].filter(Boolean).join(" · ") },
  sessions: { title: "الجلسات الخاصة", eyebrow: "بعيدًا عن المسرح", intro: "تسجيلات خاصة ونادرة وجلسات لم تكن حفلات رسمية.", icon: Disc3, sub: (r) => [r.place, r.city].filter(Boolean).join(" · ") },
  interviews: { title: "مقابلات عبد الحليم حافظ", eyebrow: "بصوته", intro: "المقابلات الإذاعية والتلفزيونية والصحفية مرتبة زمنيًا.", icon: Radio, sub: (r) => [r.program, r.host && `المذيع: ${r.host}`, r.duration].filter(Boolean).join(" · ") },
};

export function EventList({ entity }: { entity: "concerts" | "sessions" | "interviews" }) {
  const cfg = EVENT_CFG[entity];
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim());
  const query = useInfiniteList(entity, { sort: "year", order, q: dq }, 30);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  // تجميع حسب العقد
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const it of items) {
      const y = it.year ?? (it.date ? parseInt(it.date) : null);
      const k = y ? `${Math.floor(y / 10) * 10}s` : "غير مؤرخ";
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return Array.from(m.entries());
  }, [items]);

  return (
    <Container>
      <PageHeader eyebrow={cfg.eyebrow} title={cfg.title} actions={<OrderToggle order={order} setOrder={setOrder} />}>
        {cfg.intro}
      </PageHeader>
      <SearchBox value={q} onChange={setQ} placeholder="بحث بالاسم، المدينة، المناسبة، الأغاني…" />
      <div className="mt-6">
        {query.isLoading ? (
          <CardSkeleton n={4} className="space-y-3" />
        ) : !items.length ? (
          <EmptyState title={`لا توجد ${ENTITIES[entity].plural.ar} في الأرشيف بعد`} icon={<cfg.icon className="h-8 w-8" />}>
            عند إضافة أول عنصر سيظهر هنا مرتبًا زمنيًا مع التاريخ والمكان والتسجيلات.
          </EmptyState>
        ) : (
          groups.map(([g, rows]) => (
            <section key={g} className="mb-8">
              <h2 className="mb-2 font-serif text-2xl font-bold text-primary/90 tabular">{g}</h2>
              <ol className="divide-y divide-border/60 rounded-lg border border-card-border bg-card">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/${entity}/${r.id}`} className="flex items-center gap-4 p-3 hover-elevate md:p-4" data-testid={`link-${entity}-${r.id}`}>
                      <div className="w-16 shrink-0 text-center">
                        <p className="font-serif text-2xl font-bold tabular leading-none">{r.year ?? "؟"}</p>
                        {r.date && <p className="mt-1 text-[11px] text-muted-foreground">{r.date.slice(5)}</p>}
                      </div>
                      <Cover src={r.image} alt={r.title} className="hidden h-16 w-20 shrink-0 sm:block" fallback={r.id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{cfg.sub(r) || t("needsData")}</p>
                        <DateText row={r} className="mt-1 text-xs" />
                      </div>
                      {r.songsCount != null && (
                        <div className="shrink-0 text-left text-xs text-muted-foreground">
                          <p className="tabular">{r.songsCount} أغنية</p>
                          <p className="tabular text-primary">{r.audioCount} صوت</p>
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
        <InfiniteSentinel q={query} />
      </div>
    </Container>
  );
}

// ================================================================
// الأفلام
// ================================================================
export function MovieList() {
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const query = useInfiniteList("movies", { sort: "year", order }, 40);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Container>
      <PageHeader eyebrow="السينما" title="أفلام عبد الحليم حافظ" actions={<OrderToggle order={order} setOrder={setOrder} />}>
        الأفلام التي شارك فيها، مع أغانيها وصورها ومعلوماتها التاريخية.
      </PageHeader>
      {query.isLoading ? (
        <CardSkeleton n={8} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" />
      ) : !items.length ? (
        <EmptyState title="لا توجد أفلام بعد" icon={<Film className="h-8 w-8" />} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <Link key={m.id} href={`/movies/${m.id}`} className="group cv-auto" data-testid={`card-movie-${m.id}`}>
              <Cover src={m.poster} alt={m.title} className="aspect-[2/3] w-full transition-transform group-hover:-translate-y-0.5" fallback={m.id + 1} />
              <p className="mt-2 font-serif text-lg font-bold leading-snug group-hover:text-primary">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                <span className="tabular">{m.year ?? "؟"}</span>
                {m.director && ` · ${m.director}`}
              </p>
            </Link>
          ))}
        </div>
      )}
      <InfiniteSentinel q={query} />
    </Container>
  );
}

// ================================================================
// الملحنون والشعراء
// ================================================================
export function PeopleList() {
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim());
  const query = useInfiniteList("people", { roles: role, q: dq, sort: "name" }, 60);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Container>
      <PageHeader eyebrow="المتعاونون" title="الملحنون والشعراء">
        اضغط على أي اسم لعرض جميع أعماله مع عبد الحليم: الأغاني، الحفلات، التسجيلات، السنوات والصور.
      </PageHeader>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchBox value={q} onChange={setQ} placeholder="ابحث عن اسم…" />
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={!role} onClick={() => setRole("")} testid="chip-role-all">الكل</Chip>
          {OPTION_SETS.personRole.slice(0, 7).map((r) => (
            <Chip key={r.value} active={role === r.value} onClick={() => setRole(r.value)} testid={`chip-role-${r.value}`}>
              {r.label.ar}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-6">
        {query.isLoading ? (
          <CardSkeleton n={9} />
        ) : !items.length ? (
          <EmptyState title="لا توجد أسماء مطابقة" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li key={p.id}>
                <Link href={`/people/${p.id}`} className="flex items-center gap-3 rounded-lg border border-card-border bg-card p-3 hover-elevate" data-testid={`card-person-${p.id}`}>
                  <Cover src={p.image} alt={p.name} className="h-14 w-14 shrink-0 rounded-full" fallback={p.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg font-bold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{(p.roles ?? []).map((r: string) => optionLabel("personRole", r)).join(" · ") || "—"}</p>
                  </div>
                  <span className="shrink-0 text-sm tabular text-muted-foreground">{p.worksCount} عمل</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <InfiniteSentinel q={query} />
      </div>
    </Container>
  );
}

// ================================================================
// الأرشيف (كل التسجيلات) + التسجيلات النادرة
// ================================================================
export function RecordingsList({ rare }: { rare?: boolean }) {
  const [type, setType] = useState("");
  const [rareCat, setRareCat] = useState("");
  const [decade, setDecade] = useState<number | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim());
  const params: any = { recordingType: type, decade, hasAudio: hasAudio ? "1" : "", order, sort: "year", q: dq };
  if (rare) {
    params.isRare = "1";
    if (rareCat === "undated") params.undated = "1";
    else params.rareCategory = rareCat;
  }
  const query = useInfiniteList("recordings", params, 40);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  return (
    <Container>
      <PageHeader eyebrow={rare ? "كنوز الأرشيف" : "كل التسجيلات"} title={rare ? t("rare") : "الأرشيف الصوتي"} actions={<OrderToggle order={order} setOrder={setOrder} />}>
        {rare ? "بروفات، تسجيلات إذاعية، جلسات خاصة وتسجيلات غير مكتملة. التواريخ غير المؤكدة تظهر بوضوح دون اختراع." : "جميع التسجيلات بكل أنواعها مع إمكانية التشغيل والتصفية حسب النوع والعقد."}
      </PageHeader>
      <div className="flex flex-col gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="بحث في التسجيلات…" />
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="التصنيف">
          {rare ? (
            <>
              <Chip active={!rareCat} onClick={() => setRareCat("")} testid="chip-rare-all">الكل</Chip>
              {OPTION_SETS.rareCategory.map((c) => (
                <Chip key={c.value} active={rareCat === c.value} onClick={() => setRareCat(c.value)} testid={`chip-rare-${c.value}`}>
                  {c.label.ar}
                </Chip>
              ))}
            </>
          ) : (
            <>
              <Chip active={!type} onClick={() => setType("")} testid="chip-rec-all">كل الأنواع</Chip>
              {OPTION_SETS.recordingType.map((c) => (
                <Chip key={c.value} active={type === c.value} onClick={() => setType(c.value)} testid={`chip-rec-${c.value}`}>
                  {c.label.ar}
                </Chip>
              ))}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[null, 1930, 1940, 1950, 1960, 1970].map((d) => (
            <Chip key={String(d)} active={decade === d} onClick={() => setDecade(d)} testid={`chip-rec-decade-${d ?? "all"}`}>
              {d ? `${d}s` : "كل العقود"}
            </Chip>
          ))}
          <label className="ms-auto flex min-h-[40px] cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={hasAudio} onChange={(e) => setHasAudio(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" data-testid="checkbox-has-audio" />
            المتوفر صوتيًا فقط
          </label>
        </div>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{query.isLoading ? "" : `${total} تسجيل`}</p>
      <div className="mt-2">
        {query.isLoading ? (
          <CardSkeleton n={6} className="space-y-2" />
        ) : !items.length ? (
          <EmptyState title="لا توجد تسجيلات مطابقة">أضف تسجيلات وملفات MP3 من لوحة التحكم.</EmptyState>
        ) : (
          <div className="rounded-lg border border-card-border bg-card px-3">
            {items.map((r) => <RecordingRow key={r.id} r={r} queue={items} />)}
          </div>
        )}
        <InfiniteSentinel q={query} />
      </div>
    </Container>
  );
}

// ================================================================
// معرض الصور
// ================================================================
export function PhotoGallery({ params }: { params?: { id?: string } }) {
  const [cat, setCat] = useState("");
  const [color, setColor] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const query = useInfiniteList("photos", { category: cat, colorMode: color, sort: "year", order }, 48);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const { data: direct } = useApi<any>(params?.id ? `/api/item/photos/${params.id}` : null);
  const [directOpen, setDirectOpen] = useState(true);

  return (
    <Container>
      <PageHeader eyebrow="المعرض" title={t("photos")} actions={<OrderToggle order={order} setOrder={setOrder} />}>
        اضغط على أي صورة لعرضها بالحجم الكامل مع التكبير ومعلومات التاريخ والمكان والأشخاص والمصدر.
      </PageHeader>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="تصنيف الصور">
        <Chip active={!cat} onClick={() => setCat("")} testid="chip-photo-all">كل الصور</Chip>
        {OPTION_SETS.photoCategory.map((c) => (
          <Chip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)} testid={`chip-photo-${c.value}`}>
            {c.label.ar}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Chip active={!color} onClick={() => setColor("")} testid="chip-color-all">كل الألوان</Chip>
        <Chip active={color === "bw"} onClick={() => setColor("bw")} testid="chip-color-bw">بالأبيض والأسود</Chip>
        <Chip active={color === "color"} onClick={() => setColor("color")} testid="chip-color-color">ملونة</Chip>
      </div>
      <div className="mt-6">
        {query.isLoading ? (
          <CardSkeleton n={8} className="grid grid-cols-2 gap-2 md:grid-cols-4" />
        ) : !items.length ? (
          <EmptyState title="المعرض فارغ حاليًا">ارفع الصور التي تملك حق استخدامها من لوحة التحكم، وأضف تاريخها ومكانها والأشخاص فيها ومصدرها.</EmptyState>
        ) : (
          <div className="columns-2 gap-2 md:columns-3 lg:columns-4">
            {items.map((p, i) => (
              <button key={p.id} onClick={() => setOpen(i)} className="group relative mb-2 block w-full overflow-hidden rounded-md bg-muted" data-testid={`button-gallery-${p.id}`}>
                <img src={mediaUrl(p.file)} alt={p.title || "صورة"} loading="lazy" decoding="async" className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 text-right text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {p.title}
                  {p.year && <span className="block tabular text-white/70">{p.year}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
        <InfiniteSentinel q={query} />
      </div>
      {open != null && <Lightbox photos={items} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
      {direct?.item && directOpen && open == null && <Lightbox photos={[direct.item]} index={0} onClose={() => setDirectOpen(false)} onIndex={() => {}} />}
    </Container>
  );
}

// ================================================================
// الخط الزمني
// ================================================================
const COUNT_LABELS: Record<string, string> = { events: "حدث", songs: "أغنية", recordings: "تسجيل", concerts: "حفلة", sessions: "جلسة", interviews: "مقابلة", movies: "فيلم", photos: "صورة" };

export function Timeline() {
  const { data, isLoading } = useApi<any>("/api/timeline");
  const years: any[] = data?.years ?? [];
  const milestones: any[] = data?.milestones ?? [];
  const decades = useMemo(() => {
    const m = new Map<number, any[]>();
    years.forEach((y) => m.set(Math.floor(y.year / 10) * 10, [...(m.get(Math.floor(y.year / 10) * 10) ?? []), y]));
    return Array.from(m.entries());
  }, [years]);
  return (
    <Container>
      <PageHeader eyebrow="1929 — 1977" title="الخط الزمني">
        كل سنة تجمع الأحداث والأغاني والحفلات والأفلام والمقابلات والتسجيلات المرتبطة بها. اضغط على السنة للانتقال إلى كل موادها.
      </PageHeader>
      {isLoading ? (
        <CardSkeleton n={5} className="space-y-3" />
      ) : !years.length ? (
        <EmptyState title="لا توجد مواد مؤرخة بعد" />
      ) : (
        <div className="relative">
          <div className="absolute bottom-0 right-[27px] top-0 w-px bg-border md:right-[43px]" aria-hidden />
          {decades.map(([d, ys]) => (
            <section key={d} className="mb-8">
              <h2 className="relative mb-3 mr-0 inline-block rounded-full bg-primary px-4 py-1 font-serif text-xl font-bold tabular text-primary-foreground">{d}s</h2>
              <ol className="space-y-2">
                {ys.map((y: any) => {
                  const ms = milestones.filter((m) => m.year === y.year);
                  return (
                    <li key={y.year} className="relative">
                      <Link href={`/timeline/${y.year}`} className="flex items-start gap-4 rounded-lg p-2 hover:bg-card md:gap-6" data-testid={`link-timeline-${y.year}`}>
                        <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-background font-serif text-lg font-bold tabular md:h-[88px] md:w-[88px] md:text-2xl">
                          {y.year}
                        </span>
                        <div className="min-w-0 flex-1 pt-2">
                          {ms.map((m) => (
                            <p key={m.id} className="font-serif text-xl font-bold">{m.title}</p>
                          ))}
                          {ms[0]?.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ms[0].description}</p>}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(y.counts).map(([k, n]: any) => (
                              <span key={k} className="rounded-sm border border-border px-2 text-xs leading-6 text-foreground/80">
                                <span className="tabular">{n}</span> {COUNT_LABELS[k] ?? k}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ArrowLeft className="mt-5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}

const YEAR_ORDER: EntityKey[] = ["events", "songs", "recordings", "concerts", "movies", "interviews", "sessions", "photos"];

function YearGroup({ k, rows }: { k: EntityKey; rows: any[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (k === "songs") return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((s) => <SongCard key={s.id} s={s} />)}</div>;
  if (k === "recordings") return <div className="rounded-lg border border-card-border bg-card px-3">{rows.map((r) => <RecordingRow key={r.id} r={r} queue={rows} />)}</div>;
  if (k === "photos")
    return (
      <>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {rows.map((p, i) => (
            <button key={p.id} onClick={() => setOpen(i)} className="aspect-square overflow-hidden rounded-md bg-muted">
              <img src={mediaUrl(p.file)} alt={p.title || ""} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {open != null && <Lightbox photos={rows} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
      </>
    );
  if (k === "events")
    return (
      <ul className="space-y-3">
        {rows.map((e) => (
          <li key={e.id} className="rounded-lg border border-card-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-serif text-xl font-bold">{e.title}</p>
              <span className="text-xs text-muted-foreground">{optionLabel("eventType", e.eventType)}</span>
            </div>
            <DateText row={e} className="text-xs" />
            {e.description && <p className="mt-2 text-sm leading-7 text-foreground/85">{e.description}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {e.song && <Link href={`/songs/${e.song}`} className="text-primary hover:underline">{e.songName}</Link>}
              {e.movie && <Link href={`/movies/${e.movie}`} className="text-primary hover:underline">فيلم {e.movieName}</Link>}
              {e.concert && <Link href={`/concerts/${e.concert}`} className="text-primary hover:underline">{e.concertName}</Link>}
            </div>
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="divide-y divide-border/60 rounded-lg border border-card-border bg-card">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={entityHref(k, r)} className="flex min-h-[52px] items-center justify-between gap-3 px-4 hover:text-primary">
            <span className="truncate">{entityTitle(k, r)}</span>
            <DateText row={r} showBadge={false} className="shrink-0 text-xs text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TimelineYear({ params }: { params: { year: string } }) {
  const year = Number(params.year);
  const { data, isLoading } = useApi<any>(`/api/timeline/${year}`);
  const { data: tl } = useApi<any>("/api/timeline");
  const years: number[] = (tl?.years ?? []).map((y: any) => y.year);
  const idx = years.indexOf(year);
  const items = data?.items ?? {};
  const est = data?.estimated ?? {};
  const keys = YEAR_ORDER.filter((k) => items[k]);
  const estKeys = YEAR_ORDER.filter((k) => est[k]);
  return (
    <Container>
      <Link href="/timeline" className="mb-4 inline-flex min-h-[40px] items-center gap-1 text-sm text-muted-foreground hover:text-primary" data-testid="link-back-timeline">
        ← الخط الزمني
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-7xl font-bold tabular text-primary md:text-8xl" data-testid="text-year">{year}</h1>
        <div className="flex gap-2">
          {idx > 0 && <Link href={`/timeline/${years[idx - 1]}`} className="flex min-h-[44px] items-center rounded-md border border-border px-3 text-sm tabular hover:bg-accent" data-testid="link-prev-year">→ {years[idx - 1]}</Link>}
          {idx >= 0 && idx < years.length - 1 && <Link href={`/timeline/${years[idx + 1]}`} className="flex min-h-[44px] items-center rounded-md border border-border px-3 text-sm tabular hover:bg-accent" data-testid="link-next-year">{years[idx + 1]} ←</Link>}
        </div>
      </div>
      <div className="rule-ornament mt-4" />
      {isLoading ? (
        <Spinner className="mt-8" />
      ) : !keys.length && !estKeys.length ? (
        <p className="mt-10 text-muted-foreground">لا توجد مواد مسجلة لعام {year} بعد.</p>
      ) : (
        <>
          {keys.map((k) => (
            <Section key={k} title={ENTITIES[k].plural.ar} action={<span className="text-sm tabular text-muted-foreground">{items[k].length}</span>}>
              <YearGroup k={k} rows={items[k]} />
            </Section>
          ))}
          {estKeys.length > 0 && (
            <section className="mt-12 rounded-lg border border-dashed border-border p-4 md:p-6">
              <h2 className="font-serif text-2xl font-bold">مواد يُرجح أنها من هذه الفترة</h2>
              <p className="mt-1 text-sm text-muted-foreground">تاريخها غير مؤكد، ويقع عام {year} ضمن النطاق التقديري المسجل لها. {t("estimateNote")}.</p>
              {estKeys.map((k) => (
                <div key={k} className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{ENTITIES[k].plural.ar}</p>
                  <YearGroup k={k} rows={est[k]} />
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </Container>
  );
}

// ================================================================
// صفحة نتائج البحث
// ================================================================
export function SearchPage({ params }: { params: { q?: string } }) {
  const q = decodeURIComponent(params.q ?? "");
  const { data, isLoading } = useApi<any>(q ? `/api/search${qs({ q, per: 60 })}` : null);
  const groups = data?.groups ?? {};
  const keys = (["songs", "recordings", "concerts", "movies", "people", "interviews", "sessions", "photos", "events", "sources"] as EntityKey[]).filter((k) => groups[k]);
  return (
    <Container>
      <div className="mb-6 max-w-2xl">
        <LiveSearch />
      </div>
      <PageHeader eyebrow="نتائج البحث" title={`«${q}»`}>
        {isLoading ? "جارٍ البحث…" : `${data?.total ?? 0} نتيجة في الأرشيف`}
      </PageHeader>
      {data?.year && (
        <Link href={`/timeline/${data.year}`} className="mb-6 flex min-h-[56px] items-center justify-between rounded-lg bg-primary/10 px-4 text-primary" data-testid="link-search-year">
          <span>عرض كل مواد أرشيف عام {data.year}</span> <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
      {!isLoading && !keys.length && <EmptyState title={t("noResults")}>جرّب كلمة أخرى، أو اسم ملحن أو شاعر، أو سنة مثل 1970.</EmptyState>}
      {keys.map((k) => (
        <Section key={k} title={ENTITIES[k].plural.ar} action={<span className="text-sm tabular text-muted-foreground">{groups[k].total}</span>}>
          <YearGroup k={k} rows={groups[k].items} />
        </Section>
      ))}
    </Container>
  );
}
