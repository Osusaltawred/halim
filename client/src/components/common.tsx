import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Play, Pause, Music2, ExternalLink, FileQuestion, Loader2, BookOpen } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { usePlayer, recToTrack } from "@/lib/player";
import { describeDate } from "@shared/util";
import { optionLabel, ENTITIES, EntityKey } from "@shared/registry";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-label="شعار أرشيف عبد الحليم حافظ" role="img">
      <path d="M8 36V17a12 12 0 0 1 24 0v19" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 36V18a6.5 6.5 0 0 1 13 0v18" stroke="currentColor" strokeWidth="1.3" opacity=".75" />
      <path d="M17 26c1-1.6 2-1.6 3 0s2 1.6 3 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="20" cy="31" r="1.6" fill="currentColor" />
      <path d="M4 36h32" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
    </svg>
  );
}

const CERT_STYLE: Record<string, string> = {
  confirmed: "text-emerald-700 dark:text-emerald-400 border-emerald-700/25 dark:border-emerald-400/25",
  likely: "text-amber-700 dark:text-amber-300 border-amber-700/25 dark:border-amber-300/25",
  uncertain: "text-orange-700 dark:text-orange-300 border-orange-700/25 dark:border-orange-300/25",
  unknown: "text-muted-foreground border-border",
};

export function CertaintyBadge({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-sm border px-1.5 py-0 text-[11px] leading-5 font-medium", CERT_STYLE[value] ?? CERT_STYLE.unknown, className)}
      data-testid={`badge-certainty-${value}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {optionLabel("certainty", value)}
    </span>
  );
}

export function DateText({ row, showBadge = true, className }: { row: any; showBadge?: boolean; className?: string }) {
  const d = describeDate(row);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className={cn("tabular", d.certainty === "unknown" && !row.year && "text-muted-foreground")}>{d.text}</span>
      {d.estimated && <span className="text-[11px] text-muted-foreground">({t("estimateNote")})</span>}
      {showBadge && d.certainty && d.certainty !== "confirmed" && !(d.certainty === "unknown" && d.text === t("dateUncertain")) && (
        <CertaintyBadge value={d.certainty} />
      )}
      {showBadge && d.certainty === "confirmed" && <CertaintyBadge value="confirmed" />}
    </span>
  );
}

const FALLBACKS = ["./brand/cover-record.webp", "./brand/cover-reel.webp"];
export function Cover({ src, alt, className, fallback = 0, rounded = true }: { src?: string | null; alt: string; className?: string; fallback?: number; rounded?: boolean }) {
  const [err, setErr] = useState(false);
  const url = src && !err ? mediaUrl(src) : FALLBACKS[fallback % FALLBACKS.length];
  return (
    <div className={cn("relative overflow-hidden bg-muted", rounded && "rounded-md", className)}>
      <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setErr(true)} className={cn("h-full w-full object-cover", !src && "opacity-80 saturate-[.8]")} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 md:mb-8">
      {eyebrow && <p className="mb-1 text-xs font-medium tracking-wide text-primary">{eyebrow}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground" data-testid="text-page-title">
          {title}
        </h1>
        {actions}
      </div>
      {children && <div className="mt-2 max-w-2xl text-sm text-muted-foreground">{children}</div>}
      <div className="rule-ornament mt-5" />
    </header>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center" data-testid="state-empty">
      <div className="mb-3 text-primary/70">{icon ?? <FileQuestion className="h-8 w-8" />}</div>
      <p className="font-serif text-xl text-foreground">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
      <Link href="/admin" className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline" data-testid="link-empty-admin">
        الإضافة من لوحة التحكم
      </Link>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary", className)} />;
}

export function CardSkeleton({ n = 6, className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }: { n?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg bg-muted/60" />
      ))}
    </div>
  );
}

/** يحمّل الصفحة التالية تلقائيًا عند الوصول لنهاية القائمة */
export function InfiniteSentinel({ q }: { q: { hasNextPage?: boolean; fetchNextPage: () => any; isFetchingNextPage: boolean } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage]);
  if (!q.hasNextPage) return null;
  return (
    <div ref={ref} className="flex justify-center py-6">
      <button onClick={() => q.fetchNextPage()} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover-elevate" data-testid="button-load-more">
        {q.isFetchingNextPage && <Spinner className="h-4 w-4" />}
        {t("loadMore")}
      </button>
    </div>
  );
}

export function PlayButton({ rec, song, size = "md", queue, className }: { rec: any; song?: any; size?: "sm" | "md" | "lg"; queue?: any[]; className?: string }) {
  const p = usePlayer();
  const track = recToTrack(rec, song);
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  if (!track)
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground", dims, className)} title={t("noAudio")} aria-label={t("noAudio")}>
        <Music2 className="h-4 w-4 opacity-60" />
      </span>
    );
  const active = p.isCurrent(track.key);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (active) return p.toggle();
        if (queue?.length) {
          const tracks = queue.map((r) => recToTrack(r, r.songInfo ?? song)).filter(Boolean) as any[];
          const i = tracks.findIndex((x) => x.key === track.key);
          p.playQueue(tracks, Math.max(0, i));
        } else p.playTrack(track);
      }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 hover-elevate", dims, className)}
      aria-label={active && p.playing ? t("pause") : t("play")}
      data-testid={`button-play-${rec.id}`}
    >
      {active && p.playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 -translate-x-[1px]" fill="currentColor" />}
    </button>
  );
}

export function SongCard({ s }: { s: any }) {
  const types: string[] = s.recordingTypes ?? [];
  return (
    <Link href={`/songs/${s.id}`} className="group flex gap-3 rounded-lg border border-card-border bg-card p-3 hover-elevate cv-auto" data-testid={`card-song-${s.id}`}>
      <Cover src={s.image} alt={s.title} className="h-20 w-20 shrink-0" fallback={s.id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-serif text-lg font-bold leading-snug text-foreground">{s.title}</h3>
          {s.playable && <PlayButton rec={{ ...s.playable }} song={s} size="sm" />}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[s.composerName && `لحن ${s.composerName}`, s.lyricistName && `كلمات ${s.lyricistName}`].filter(Boolean).join(" · ") || t("needsData")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <DateText row={s} showBadge={false} className="text-foreground/80" />
          {s.category && <span className="rounded-sm bg-secondary px-1.5 text-[11px] leading-5 text-secondary-foreground">{optionLabel("songCategory", s.category)}</span>}
          {types.slice(0, 2).map((ty) => (
            <span key={ty} className="rounded-sm border border-border px-1.5 text-[11px] leading-5 text-muted-foreground">
              {optionLabel("recordingType", ty)}
            </span>
          ))}
          {s.recordingsCount > 0 && <span className="text-[11px] text-muted-foreground">{s.recordingsCount} تسجيل</span>}
        </div>
      </div>
    </Link>
  );
}

export function RecordingRow({ r, queue, showSong = true, index }: { r: any; queue?: any[]; showSong?: boolean; index?: number }) {
  const title = showSong ? r.songInfo?.title ?? r.songName : r.title || optionLabel("recordingType", r.recordingType) || "تسجيل";
  const sub = [
    showSong ? r.title : "",
    optionLabel("recordingType", r.recordingType),
    r.concertName,
    r.movieName && `فيلم ${r.movieName}`,
    r.sessionName,
    r.city,
  ].filter(Boolean);
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0 cv-auto" data-testid={`row-recording-${r.id}`}>
      {index != null && <span className="w-6 shrink-0 text-center text-xs tabular text-muted-foreground">{index}</span>}
      <PlayButton rec={r} queue={queue} size="sm" />
      <Link href={`/recordings/${r.id}`} className="min-w-0 flex-1" data-testid={`link-recording-${r.id}`}>
        <p className="truncate font-medium text-foreground hover:text-primary">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub.join(" · ") || t("needsData")}</p>
      </Link>
      <div className="hidden shrink-0 text-xs sm:block">
        <DateText row={r} showBadge={false} className="text-muted-foreground" />
      </div>
      {r.duration && <span className="shrink-0 text-xs tabular text-muted-foreground">{r.duration}</span>}
      {r.isRare && <span className="shrink-0 rounded-sm bg-primary/15 px-1.5 text-[11px] leading-5 text-primary">نادر</span>}
    </div>
  );
}

export interface MetaItem {
  label: string;
  value?: ReactNode;
  href?: string;
  certainty?: string | null;
}
export function MetaGrid({ items }: { items: MetaItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5" data-testid={`meta-${i}`}>
          <dt className="shrink-0 text-xs text-muted-foreground">{it.label}</dt>
          <dd className="min-w-0 text-left text-sm text-foreground">
            {it.value == null || it.value === "" ? (
              <span className="text-muted-foreground/70">{t("needsData")}</span>
            ) : it.href ? (
              <Link href={it.href} className="text-primary underline-offset-4 hover:underline">
                {it.value}
              </Link>
            ) : (
              it.value
            )}
            {it.certainty && <CertaintyBadge value={it.certainty} className="ms-2" />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SourcesPanel({ citations, entity }: { citations: any[]; entity: EntityKey }) {
  const def = ENTITIES[entity];
  const fieldLabel = (f: string) => (f === "general" || !f ? "معلومة عامة" : def.fields.find((x) => x.key === f)?.label.ar ?? f);
  return (
    <section className="mt-10" aria-labelledby="sources-h">
      <h2 id="sources-h" className="mb-3 flex items-center gap-2 font-serif text-2xl font-bold">
        <BookOpen className="h-5 w-5 text-primary" /> {t("sources")}
      </h2>
      {!citations?.length ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">لم يُضف مصدر لهذه المادة بعد. المعلومات المعروضة تحتاج إلى توثيق.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-card-border bg-card">
          {citations.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-citation-${c.id}`}>
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">{fieldLabel(c.field)}: </span>
                  {c.sourceInfo?.url ? (
                    <a href={c.sourceInfo.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                      {c.sourceInfo.title} <ExternalLink className="inline h-3 w-3" />
                    </a>
                  ) : (
                    c.sourceInfo?.title ?? c.sourceName ?? "مصدر غير محدد"
                  )}
                </p>
                {(c.detail || c.note) && <p className="text-xs text-muted-foreground">{[c.detail, c.note].filter(Boolean).join(" — ")}</p>}
              </div>
              <CertaintyBadge value={c.certainty} className="self-start sm:self-center" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Section({ title, children, action, id }: { title: string; children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <section className="mt-10" id={id}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-serif text-2xl font-bold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chip({ active, onClick, children, testid }: { active?: boolean; onClick: () => void; children: ReactNode; testid?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testid}
      className={cn(
        "min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-foreground/85 hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

export function Prose({ text }: { text?: string | null }) {
  if (!text) return null;
  return <div className="whitespace-pre-line text-[15px] leading-8 text-foreground/90">{text}</div>;
}

export function PhotoStrip({ photos, onOpen }: { photos: any[]; onOpen?: (i: number) => void }) {
  if (!photos?.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {photos.map((p, i) => (
        <button key={p.id} onClick={() => onOpen?.(i)} className="aspect-square overflow-hidden rounded-md bg-muted" data-testid={`button-photo-${p.id}`}>
          <img src={mediaUrl(p.file)} alt={p.title || "صورة"} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform hover:scale-105" />
        </button>
      ))}
    </div>
  );
}
