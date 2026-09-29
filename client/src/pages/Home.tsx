import { useState } from "react";
import { Link } from "wouter";
import { Music, Mic2, Radio, Disc3, Image as ImageIcon, Clock, Archive, ArrowLeft, Film, PenLine } from "lucide-react";
import { useApi, mediaUrl } from "@/lib/api";
import { LiveSearch, entityHref, entityTitle } from "@/components/Layout";
import { SongCard, DateText, Spinner, CertaintyBadge, CardSkeleton } from "@/components/common";
import { ENTITIES, EntityKey, optionLabel } from "@shared/registry";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TILES = [
  { href: "/songs", label: t("songs"), icon: Music, key: "songs" },
  { href: "/concerts", label: t("concerts"), icon: Mic2, key: "concerts" },
  { href: "/interviews", label: t("interviews"), icon: Radio, key: "interviews" },
  { href: "/sessions", label: t("sessions"), icon: Disc3, key: "sessions" },
  { href: "/photos", label: t("photos"), icon: ImageIcon, key: "photos" },
  { href: "/timeline", label: t("timeline"), icon: Clock, key: "events" },
  { href: "/archive", label: t("archive"), icon: Archive, key: "recordings" },
];

function Journey() {
  const { data } = useApi<any>("/api/timeline");
  const milestones: any[] = data?.milestones ?? [];
  const [sel, setSel] = useState<number | null>(null);
  const selected = sel ?? milestones[0]?.year ?? null;
  const { data: yearData, isLoading } = useApi<any>(selected ? `/api/timeline/${selected}` : null);
  const selEvents = milestones.filter((m) => m.year === selected);

  return (
    <section className="relative border-y border-border/70 bg-card/40" aria-labelledby="journey-h">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-primary">1929 — 1977</p>
            <h2 id="journey-h" className="font-serif text-3xl font-bold md:text-4xl">{t("journey")}</h2>
          </div>
          <Link href="/timeline" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-primary" data-testid="link-full-timeline">
            الخط الزمني الكامل <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* شريط السنوات */}
        <div className="relative mt-8">
          <div className="absolute inset-x-0 top-[27px] h-px bg-border" aria-hidden />
          <ol className="scrollbar-none relative flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="سنوات الرحلة">
            {milestones.map((m, i) => {
              const on = m.year === selected;
              const dupe = i > 0 && milestones[i - 1].year === m.year;
              if (dupe) return null;
              return (
                <li key={m.id} className="shrink-0">
                  <button
                    role="tab"
                    aria-selected={on}
                    onClick={() => setSel(m.year)}
                    className="group flex w-28 flex-col items-center gap-2 text-center md:w-32"
                    data-testid={`button-journey-${m.year}`}
                  >
                    <span className={cn("rounded-full px-3 py-1 font-serif text-lg tabular transition-colors", on ? "bg-primary text-primary-foreground" : "bg-background text-foreground/80 ring-1 ring-border group-hover:ring-primary/60")}>
                      {m.year}
                    </span>
                    <span className={cn("line-clamp-2 text-xs leading-5", on ? "text-foreground" : "text-muted-foreground")}>{m.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* تفاصيل السنة المختارة */}
        {selected && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]" data-testid="panel-journey-year">
            <div>
              <p className="font-serif text-6xl font-bold leading-none text-primary/90 tabular md:text-7xl">{selected}</p>
              {selEvents.map((e) => (
                <div key={e.id} className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-2xl font-bold">{e.title}</h3>
                    <CertaintyBadge value={e.dateCertainty} />
                  </div>
                  {e.date && <p className="text-xs text-muted-foreground"><DateText row={e} showBadge={false} /></p>}
                  {e.description && <p className="mt-2 max-w-xl text-[15px] leading-8 text-foreground/85">{e.description}</p>}
                </div>
              ))}
              <Link href={`/timeline/${selected}`} className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-primary/40 px-4 text-sm text-primary hover:bg-primary/10" data-testid="link-year-all">
                {t("allOfYear")} {selected} <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-lg border border-card-border bg-background/60 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">أعمال ومواد مرتبطة بهذا العام</p>
              {isLoading ? (
                <Spinner />
              ) : (
                <ul className="divide-y divide-border/60">
                  {Object.entries(yearData?.items ?? {})
                    .filter(([k]) => k !== "events")
                    .flatMap(([k, rows]: any) => rows.map((r: any) => ({ k, r })))
                    .slice(0, 8)
                    .map(({ k, r }) => (
                      <li key={`${k}-${r.id}`}>
                        <Link href={entityHref(k, r)} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary" data-testid={`link-journey-item-${k}-${r.id}`}>
                          <span className="truncate">{entityTitle(k, r)}</span>
                          <span className="shrink-0 rounded-sm bg-secondary px-1.5 text-[11px] leading-5 text-secondary-foreground">{ENTITIES[k as EntityKey].label.ar}</span>
                        </Link>
                      </li>
                    ))}
                  {!Object.keys(yearData?.items ?? {}).filter((k) => k !== "events").length && <li className="py-3 text-sm text-muted-foreground">لا توجد مواد أخرى مسجلة لهذا العام بعد.</li>}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: stats } = useApi<any>("/api/stats");
  const { data: recent, isLoading } = useApi<any>("/api/list/songs?sort=year&order=asc&limit=6");
  const s = stats?.settings ?? {};
  const c = stats?.counts ?? {};
  const decades: any[] = stats?.decades ?? [];
  const heroImg = s.heroImage ? mediaUrl(s.heroImage) : "./brand/hero-stage.webp";

  return (
    <>
      {/* البطل السينمائي */}
      <section className="grain relative overflow-hidden bg-[hsl(28_22%_5%)] text-[hsl(38_32%_90%)]">
        <div className="absolute inset-0 opacity-[.35]" aria-hidden>
          <img src={heroImg} alt="" className="h-full w-full scale-110 object-cover blur-2xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-l from-[hsl(28_22%_5%)] via-[hsl(28_22%_5%/.88)] to-[hsl(28_22%_5%/.55)]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 md:px-6 md:pb-20 md:pt-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="text-sm tracking-wide text-[hsl(38_58%_62%)]">٢١ يونيو ١٩٢٩ — ٣٠ مارس ١٩٧٧</p>
            <h1 className="mt-2 font-serif text-5xl font-bold leading-[1.15] md:text-7xl" data-testid="text-hero-title">
              عبد الحليم حافظ
            </h1>
            <p className="mt-1 font-serif text-xl text-[hsl(38_20%_72%)] md:text-2xl">الأرشيف الرقمي الشامل</p>
            <p className="mt-5 max-w-xl text-[15px] leading-8 text-[hsl(38_18%_78%)]" data-testid="text-bio">
              {s.bio}
            </p>
            <div className="mt-7 max-w-xl [&_form]:border-white/15 [&_form]:bg-black/35 [&_input]:text-[hsl(38_32%_92%)]">
              <LiveSearch big />
            </div>
            <nav className="mt-6 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4" aria-label="أقسام الأرشيف">
              {TILES.map((tile) => (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className="group flex min-h-[56px] items-center gap-2.5 rounded-md border border-white/10 bg-white/[.04] px-3 transition-colors hover:border-[hsl(38_58%_60%/.6)] hover:bg-white/[.07]"
                  data-testid={`link-tile-${tile.href.slice(1)}`}
                >
                  <tile.icon className="h-4 w-4 text-[hsl(38_58%_62%)]" />
                  <span className="text-sm">{tile.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="arch relative aspect-[3/4] overflow-hidden border border-[hsl(38_58%_60%/.35)] p-2">
              <div className="arch h-full w-full overflow-hidden">
                <img src={heroImg} alt={s.heroImage ? "عبد الحليم حافظ" : "مسرح وميكروفون قديم"} className="h-full w-full object-cover" fetchPriority="high" data-testid="img-hero" />
              </div>
            </div>
            <div className="mx-auto mt-3 h-px w-2/3 bg-gradient-to-l from-transparent via-[hsl(38_58%_60%/.6)] to-transparent" />
            {s.heroCaption && <p className="mt-2 text-center text-xs text-[hsl(38_18%_70%)]">{s.heroCaption}</p>}
          </div>
        </div>
      </section>

      {/* أرقام الأرشيف */}
      <section className="mx-auto max-w-7xl px-4 md:px-6" aria-label="محتوى الأرشيف">
        <dl className="grid grid-cols-3 divide-x divide-x-reverse divide-border/70 border-b border-border/70 py-6 sm:grid-cols-6">
          {[
            ["songs", "أغنية"],
            ["recordings", "تسجيل"],
            ["audio", "ملف صوتي"],
            ["concerts", "حفلة"],
            ["movies", "فيلم"],
            ["photos", "صورة"],
          ].map(([k, l]) => (
            <div key={k} className="px-3 py-2 text-center">
              <dt className="text-xs text-muted-foreground">{l}</dt>
              <dd className="font-serif text-3xl font-bold tabular text-foreground" data-testid={`stat-${k}`}>{c[k] ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-12">
        <Journey />
      </div>

      {/* تصفح حسب العقد */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <h2 className="font-serif text-3xl font-bold">تصفح حسب العقد</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[1930, 1940, 1950, 1960, 1970].map((d) => {
            const n = decades.find((x) => x.d === d)?.c ?? 0;
            return (
              <Link key={d} href={`/songs/decade/${d}`} className="group relative overflow-hidden rounded-lg border border-card-border bg-card p-5 hover-elevate" data-testid={`link-decade-${d}`}>
                <p className="font-serif text-4xl font-bold tabular text-foreground group-hover:text-primary">{d}s</p>
                <p className="mt-1 text-xs text-muted-foreground">{n ? `${n} أغنية` : "لا توجد أغانٍ مؤرخة بعد"}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* مختارات */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-3xl font-bold">من الأرشيف</h2>
          <Link href="/songs" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-primary" data-testid="link-all-songs">
            كل الأغاني <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? <CardSkeleton /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent?.items?.map((s: any) => <SongCard key={s.id} s={s} />)}
          </div>
        )}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Link href="/movies" className="flex min-h-[64px] items-center justify-between rounded-lg border border-card-border bg-card px-5 hover-elevate" data-testid="link-home-movies">
            <span className="flex items-center gap-3"><Film className="h-5 w-5 text-primary" /> {t("movies")}</span>
            <span className="tabular text-sm text-muted-foreground">{c.movies ?? 0}</span>
          </Link>
          <Link href="/people" className="flex min-h-[64px] items-center justify-between rounded-lg border border-card-border bg-card px-5 hover-elevate" data-testid="link-home-people">
            <span className="flex items-center gap-3"><PenLine className="h-5 w-5 text-primary" /> {t("people")}</span>
            <span className="tabular text-sm text-muted-foreground">{c.people ?? 0}</span>
          </Link>
          <Link href="/rare" className="flex min-h-[64px] items-center justify-between rounded-lg border border-card-border bg-card px-5 hover-elevate" data-testid="link-home-rare">
            <span className="flex items-center gap-3"><Disc3 className="h-5 w-5 text-primary" /> {t("rare")}</span>
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>
    </>
  );
}
