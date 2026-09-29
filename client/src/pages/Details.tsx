import { useState } from "react";
import { Link } from "wouter";
import { Play, ExternalLink, ArrowRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { usePlayer, recToTrack } from "@/lib/player";
import { Container } from "@/components/Layout";
import { Cover, DateText, MetaGrid, SourcesPanel, Section, RecordingRow, PlayButton, Prose, PhotoStrip, SongCard, CertaintyBadge, Spinner, CardSkeleton } from "@/components/common";
import { Lightbox } from "@/components/Lightbox";
import { optionLabel, EntityKey } from "@shared/registry";
import { describeDate } from "@shared/util";
import { t } from "@/lib/i18n";

function Loading() {
  return (
    <Container>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="aspect-square animate-pulse rounded-lg bg-muted" />
        <CardSkeleton n={4} className="space-y-3" />
      </div>
    </Container>
  );
}
function NotFoundItem() {
  return (
    <Container>
      <p className="py-20 text-center text-muted-foreground">لم يتم العثور على هذه المادة.</p>
    </Container>
  );
}

function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex min-h-[40px] items-center gap-1 text-sm text-muted-foreground hover:text-primary" data-testid="link-back">
      <ArrowRight className="h-4 w-4" /> {label}
    </Link>
  );
}

function PlayAll({ recs, song, label = "تشغيل الكل" }: { recs: any[]; song?: any; label?: string }) {
  const p = usePlayer();
  const tracks = recs.map((r) => recToTrack(r, r.songInfo ?? song)).filter(Boolean) as any[];
  if (!tracks.length)
    return <span className="inline-flex min-h-[48px] items-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">{t("noAudio")}</span>;
  return (
    <button onClick={() => p.playQueue(tracks, 0)} className="inline-flex min-h-[48px] items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground active:scale-[.98]" data-testid="button-play-all">
      <Play className="h-4 w-4" fill="currentColor" /> {label} ({tracks.length})
    </button>
  );
}

function usePhotos() {
  const [open, setOpen] = useState<number | null>(null);
  return { open, setOpen };
}

function Photos({ photos }: { photos?: any[] }) {
  const { open, setOpen } = usePhotos();
  if (!photos?.length) return null;
  return (
    <Section title="الصور">
      <PhotoStrip photos={photos} onOpen={setOpen} />
      {open != null && <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </Section>
  );
}

const fieldCert = (citations: any[], field: string) => citations?.find((c) => c.field === field)?.certainty;

// ================================================================
// صفحة الأغنية
// ================================================================
export function SongDetail({ params }: { params: { id: string } }) {
  const { data, isLoading } = useApi<any>(`/api/item/songs/${params.id}`);
  if (isLoading) return <Loading />;
  if (!data) return <NotFoundItem />;
  const s = data.item;
  const recs: any[] = data.related.recordings ?? [];
  const main = recs.find((r) => r.audioFile) ?? recs[0];
  const cit = data.citations;
  const types = Array.from(new Set(recs.map((r) => optionLabel("recordingType", r.recordingType)).filter(Boolean)));
  const concerts = Array.from(new Map(recs.filter((r) => r.concert).map((r) => [r.concert, r.concertName])).entries());
  const places = Array.from(new Set(recs.map((r) => [r.place, r.city].filter(Boolean).join("، ")).filter(Boolean)));

  return (
    <Container>
      <Back href="/songs" label={t("songs")} />
      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <Cover src={s.image ?? main?.image} alt={s.title} className="aspect-square w-full max-w-sm" fallback={s.id} />
        <div>
          <p className="text-xs font-medium text-primary">{optionLabel("songCategory", s.category) || "أغنية"}</p>
          <h1 className="mt-1 font-serif text-4xl font-bold md:text-5xl" data-testid="text-song-title">{s.title}</h1>
          {s.altTitles && <p className="mt-1 text-sm text-muted-foreground">{s.altTitles}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {main && <PlayButton rec={main} song={s} size="lg" queue={recs.filter((r) => r.audioFile)} />}
            <PlayAll recs={recs} song={s} label="تشغيل كل النسخ" />
          </div>
          <div className="mt-6">
            <MetaGrid
              items={[
                { label: "السنة", value: <DateText row={s} /> },
                { label: "التاريخ", value: s.date ? describeDate(s).text : "", certainty: fieldCert(cit, "date") },
                { label: "الملحن", value: s.composerName, href: s.composer ? `/people/${s.composer}` : undefined, certainty: fieldCert(cit, "composer") },
                { label: "الشاعر", value: s.lyricistName, href: s.lyricist ? `/people/${s.lyricist}` : undefined, certainty: fieldCert(cit, "lyricist") },
                { label: "الموزع", value: s.arrangerName, href: s.arranger ? `/people/${s.arranger}` : undefined },
                { label: "نوع التسجيل", value: types.join("، ") },
                { label: "مكان التسجيل", value: places.join(" / ") },
                { label: "الحفلة", value: concerts.length ? concerts.map(([id, n]) => <Link key={id} href={`/concerts/${id}`} className="text-primary hover:underline">{n}</Link>) : "" },
                { label: "الفيلم", value: s.movieName, href: s.movie ? `/movies/${s.movie}` : undefined },
                { label: "مدة التسجيل", value: main?.duration },
              ]}
            />
          </div>
        </div>
      </div>

      <Section title={t("otherVersions")} action={<span className="text-sm text-muted-foreground">{recs.length} تسجيل</span>}>
        {recs.length ? (
          <div className="overflow-hidden rounded-lg border border-card-border bg-card">
            <table className="w-full text-sm">
              <thead className="hidden bg-muted/50 text-xs text-muted-foreground md:table-header-group">
                <tr>
                  <th className="w-14 p-3" />
                  <th className="p-3 text-right font-medium">النسخة</th>
                  <th className="p-3 text-right font-medium">النوع</th>
                  <th className="p-3 text-right font-medium">التاريخ</th>
                  <th className="p-3 text-right font-medium">المكان / المناسبة</th>
                  <th className="p-3 text-right font-medium">المدة</th>
                  <th className="p-3 text-right font-medium">المصدر</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={r.id} className="grid grid-cols-[48px_1fr] gap-x-2 border-t border-border/60 p-3 first:border-t-0 md:table-row md:p-0" data-testid={`row-version-${r.id}`}>
                    <td className="row-span-3 md:p-3"><PlayButton rec={r} song={s} size="sm" queue={recs} /></td>
                    <td className="md:p-3">
                      <Link href={`/recordings/${r.id}`} className="font-medium hover:text-primary">{r.title || optionLabel("recordingType", r.recordingType) || "تسجيل"}</Link>
                      {r.isRare && <span className="ms-2 rounded-sm bg-primary/15 px-1.5 text-[11px] text-primary">نادر</span>}
                    </td>
                    <td className="text-xs text-muted-foreground md:p-3 md:text-sm md:text-foreground">{optionLabel("recordingType", r.recordingType) || "—"}</td>
                    <td className="text-xs md:p-3 md:text-sm"><DateText row={r} /></td>
                    <td className="col-start-2 text-xs text-muted-foreground md:p-3 md:text-sm md:text-foreground">
                      {[r.concertName, r.movieName && `فيلم ${r.movieName}`, r.sessionName, r.place, r.city].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="col-start-2 text-xs tabular text-muted-foreground md:p-3">{r.duration || "—"}</td>
                    <td className="col-start-2 text-xs text-muted-foreground md:p-3">{r.recordingSource || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد تسجيلات مسجلة لهذه الأغنية بعد.</p>
        )}
      </Section>

      {(s.description || s.notes) && (
        <Section title="ملاحظات تاريخية">
          <Prose text={s.description} />
          <Prose text={s.notes} />
        </Section>
      )}
      {s.lyrics && (
        <Section title="من كلمات الأغنية">
          <blockquote className="border-r-2 border-primary/50 pr-4 font-serif text-xl leading-10 text-foreground/90">
            <Prose text={s.lyrics} />
          </blockquote>
        </Section>
      )}
      <Photos photos={data.related.photos} />
      <SourcesPanel citations={cit} entity="songs" />
    </Container>
  );
}

// ================================================================
// صفحة التسجيل
// ================================================================
export function RecordingDetail({ params }: { params: { id: string } }) {
  const { data, isLoading } = useApi<any>(`/api/item/recordings/${params.id}`);
  if (isLoading) return <Loading />;
  if (!data) return <NotFoundItem />;
  const r = data.item;
  const song = data.related.song;
  return (
    <Container>
      <Back href={song ? `/songs/${song.id}` : "/archive"} label={song?.title ?? t("archive")} />
      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <Cover src={r.image ?? song?.image} alt={song?.title ?? "تسجيل"} className="aspect-square w-full max-w-sm" fallback={r.id + 1} />
        <div>
          <p className="text-xs font-medium text-primary">{optionLabel("recordingType", r.recordingType) || "تسجيل"}{r.isRare ? " · نادر" : ""}</p>
          <h1 className="mt-1 font-serif text-4xl font-bold" data-testid="text-recording-title">{song?.title}</h1>
          {r.title && <p className="mt-1 text-lg text-muted-foreground">{r.title}</p>}
          <div className="mt-5 flex items-center gap-3">
            <PlayButton rec={r} song={song} size="lg" />
            {!r.audioFile && <span className="text-sm text-muted-foreground">{t("noAudio")}</span>}
          </div>
          <div className="mt-6">
            <MetaGrid
              items={[
                { label: "التاريخ", value: <DateText row={r} /> },
                { label: "ملاحظة التاريخ", value: r.dateNote || undefined },
                { label: "الملحن", value: song?.composerName, href: song?.composer ? `/people/${song.composer}` : undefined },
                { label: "الشاعر", value: song?.lyricistName, href: song?.lyricist ? `/people/${song.lyricist}` : undefined },
                { label: "الموزع", value: r.arrangerName || song?.arrangerName },
                { label: "نوع التسجيل", value: optionLabel("recordingType", r.recordingType) },
                { label: "مكان التسجيل", value: [r.place, r.city, r.country].filter(Boolean).join("، ") },
                { label: "الحفلة", value: r.concertName, href: r.concert ? `/concerts/${r.concert}` : undefined },
                { label: "الجلسة", value: r.sessionName, href: r.session ? `/sessions/${r.session}` : undefined },
                { label: "الفيلم", value: r.movieName, href: r.movie ? `/movies/${r.movie}` : undefined },
                { label: "المدة", value: r.duration },
                { label: "مصدر التسجيل", value: r.recordingSource },
              ].filter((x) => x.label !== "ملاحظة التاريخ" || x.value)}
            />
          </div>
        </div>
      </div>
      {r.notes && (
        <Section title="ملاحظات">
          <Prose text={r.notes} />
        </Section>
      )}
      {data.related.siblings?.length > 0 && (
        <Section title={t("otherVersions")}>
          <div className="rounded-lg border border-card-border bg-card px-3">
            {data.related.siblings.map((x: any) => <RecordingRow key={x.id} r={x} showSong={false} queue={data.related.siblings} />)}
          </div>
        </Section>
      )}
      <SourcesPanel citations={data.citations} entity="recordings" />
    </Container>
  );
}

// ================================================================
// الحفلات / الجلسات / المقابلات / الأفلام
// ================================================================
const BACK: Record<string, [string, string]> = {
  concerts: ["/concerts", t("concerts")],
  sessions: ["/sessions", t("sessions")],
  interviews: ["/interviews", t("interviews")],
  movies: ["/movies", t("movies")],
};

export function EventDetail({ entity, params }: { entity: EntityKey; params: { id: string } }) {
  const { data, isLoading } = useApi<any>(`/api/item/${entity}/${params.id}`);
  if (isLoading) return <Loading />;
  if (!data) return <NotFoundItem />;
  const it = data.item;
  const recs: any[] = data.related.recordings ?? [];
  const [bh, bl] = BACK[entity];

  let meta: any[] = [];
  if (entity === "concerts")
    meta = [
      { label: "تاريخ الحفلة", value: <DateText row={it} /> },
      { label: "المكان", value: it.venue },
      { label: "المدينة", value: it.city },
      { label: "الدولة", value: it.country },
      { label: "المناسبة", value: it.occasion },
      { label: "التسجيلات المتوفرة", value: `${recs.filter((r) => r.audioFile).length} من ${recs.length}` },
    ];
  if (entity === "sessions")
    meta = [
      { label: "التاريخ", value: <DateText row={it} /> },
      { label: "المكان", value: [it.place, it.city].filter(Boolean).join("، ") },
      { label: "الأشخاص الموجودون", value: it.attendees },
      { label: "التسجيلات المتوفرة", value: `${recs.filter((r) => r.audioFile).length} من ${recs.length}` },
    ];
  if (entity === "interviews")
    meta = [
      { label: "التاريخ", value: <DateText row={it} /> },
      { label: "البرنامج أو الجهة", value: it.program },
      { label: "المذيع", value: it.host },
      { label: "المكان", value: it.place },
      { label: "المدة", value: it.duration },
    ];
  if (entity === "movies")
    meta = [
      { label: "سنة الإنتاج", value: <DateText row={it} /> },
      { label: "المخرج", value: it.director },
      { label: "الأبطال", value: it.cast },
      { label: "ملاحظة", value: it.dateNote },
    ].filter((m) => m.label !== "ملاحظة" || m.value);

  const img = it.image ?? it.poster;
  const interviewRec = entity === "interviews" && it.audioFile ? { id: `int-${it.id}`, audioFile: it.audioFile, title: it.title, image: it.image } : null;

  return (
    <Container>
      <Back href={bh} label={bl} />
      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <Cover src={img} alt={it.title} className={entity === "movies" ? "aspect-[2/3] w-full max-w-xs" : "aspect-[4/3] w-full max-w-sm"} fallback={it.id} />
        <div>
          <p className="text-xs font-medium text-primary">{bl}</p>
          <h1 className="mt-1 font-serif text-4xl font-bold" data-testid="text-item-title">{it.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {recs.length > 0 && <PlayAll recs={recs} />}
            {interviewRec && <PlayButton rec={interviewRec} song={{ title: it.title }} size="lg" />}
            {it.videoUrl && (
              <a href={it.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-accent" data-testid="link-video">
                <ExternalLink className="h-4 w-4" /> مشاهدة الفيديو
              </a>
            )}
          </div>
          <div className="mt-6">
            <MetaGrid items={meta} />
          </div>
        </div>
      </div>

      {entity === "concerts" || entity === "sessions" ? (
        <Section title="قائمة الأغاني" action={<span className="text-sm text-muted-foreground">{recs.length}</span>}>
          {recs.length ? (
            <div className="rounded-lg border border-card-border bg-card px-3">
              {recs.map((r, i) => <RecordingRow key={r.id} r={r} index={i + 1} queue={recs} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لم تُضف أغاني لهذه {entity === "concerts" ? "الحفلة" : "الجلسة"} بعد. أضف تسجيلًا واربطه بها من لوحة التحكم.</p>
          )}
        </Section>
      ) : null}

      {entity === "movies" && (
        <>
          <Section title="أغاني الفيلم">
            {data.related.songs?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.related.songs.map((s: any) => <SongCard key={s.id} s={s} />)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">لم تُربط أغانٍ بهذا الفيلم بعد.</p>
            )}
          </Section>
          {it.plot && <Section title="القصة"><Prose text={it.plot} /></Section>}
          {it.mediaLinks && <Section title="روابط وملفات الوسائط"><Prose text={it.mediaLinks} /></Section>}
        </>
      )}

      {(it.description || it.history || it.notes) && (
        <Section title="معلومات تاريخية">
          <div className="space-y-4">
            <Prose text={it.description} />
            <Prose text={it.history} />
            <Prose text={it.notes} />
          </div>
        </Section>
      )}
      <Photos photos={data.related.photos} />
      <SourcesPanel citations={data.citations} entity={entity} />
    </Container>
  );
}

// ================================================================
// صفحة الشخص (ملحن / شاعر)
// ================================================================
export function PersonDetail({ params }: { params: { id: string } }) {
  const { data, isLoading } = useApi<any>(`/api/item/people/${params.id}`);
  if (isLoading) return <Loading />;
  if (!data) return <NotFoundItem />;
  const p = data.item;
  const R = data.related;
  const asComposer = R.songs.filter((s: any) => s.composer === p.id).length;
  const asLyricist = R.songs.filter((s: any) => s.lyricist === p.id).length;
  return (
    <Container>
      <Back href="/people" label={t("people")} />
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <Cover src={p.image} alt={p.name} className="aspect-square w-full max-w-[240px]" fallback={p.id} />
        <div>
          <p className="text-xs font-medium text-primary">{(p.roles ?? []).map((r: string) => optionLabel("personRole", r)).join(" · ") || "متعاون"}</p>
          <h1 className="mt-1 font-serif text-4xl font-bold md:text-5xl" data-testid="text-person-name">{p.name}</h1>
          {(p.birthYear || p.deathYear) && <p className="mt-1 text-sm tabular text-muted-foreground">{p.birthYear ?? "؟"} — {p.deathYear ?? ""}</p>}
          <dl className="mt-5 flex flex-wrap gap-6">
            {[["أغنية", R.songs.length], ["تسجيل", R.recordings.length], ["حفلة", R.concerts.length], ["ألحان", asComposer], ["كلمات", asLyricist]].map(([l, n]) => (
              <div key={l as string}>
                <dd className="font-serif text-3xl font-bold tabular">{n as number}</dd>
                <dt className="text-xs text-muted-foreground">{l}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <PlayAll recs={R.recordings} label={`تشغيل أعمال ${p.name}`} />
          </div>
          {p.bio && <div className="mt-6"><Prose text={p.bio} /></div>}
        </div>
      </div>

      {R.years?.length > 0 && (
        <Section title="السنوات">
          <div className="flex flex-wrap gap-2">
            {R.years.map((y: number) => (
              <Link key={y} href={`/timeline/${y}`} className="min-h-[40px] rounded-md border border-border px-3 py-2 text-sm tabular hover:border-primary/60 hover:text-primary" data-testid={`link-person-year-${y}`}>
                {y}
              </Link>
            ))}
          </div>
        </Section>
      )}
      <Section title="جميع الأغاني مع عبد الحليم" action={<span className="text-sm text-muted-foreground">{R.songs.length}</span>}>
        {R.songs.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{R.songs.map((s: any) => <SongCard key={s.id} s={s} />)}</div> : <p className="text-sm text-muted-foreground">لا توجد أعمال مرتبطة بعد.</p>}
      </Section>
      {R.recordings.length > 0 && (
        <Section title="جميع التسجيلات">
          <div className="rounded-lg border border-card-border bg-card px-3">{R.recordings.map((r: any) => <RecordingRow key={r.id} r={r} queue={R.recordings} />)}</div>
        </Section>
      )}
      {R.concerts.length > 0 && (
        <Section title="الحفلات">
          <ul className="divide-y divide-border/60 rounded-lg border border-card-border bg-card">
            {R.concerts.map((c: any) => (
              <li key={c.id}>
                <Link href={`/concerts/${c.id}`} className="flex min-h-[52px] items-center justify-between px-4 hover:text-primary">
                  <span>{c.title}</span>
                  <DateText row={c} showBadge={false} className="text-xs text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {p.collaboration && <Section title="عن التعاون مع عبد الحليم"><Prose text={p.collaboration} /></Section>}
      <Photos photos={R.photos} />
      <SourcesPanel citations={data.citations} entity="people" />
    </Container>
  );
}
