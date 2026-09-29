import { useState } from "react";
import { Link } from "wouter";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic, ChevronDown, X, Music2, Loader2, ChevronUp } from "lucide-react";
import { usePlayer, fmtTime } from "@/lib/player";
import { mediaUrl } from "@/lib/api";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

function Art({ src, className }: { src?: string | null; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-md bg-muted", className)}>
      <img src={src ? mediaUrl(src) : "./brand/cover-record.webp"} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

function IconBtn({ label, onClick, children, active, className, testid }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      data-testid={testid}
      className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground hover:bg-accent", active && "text-primary", className)}
    >
      {children}
    </button>
  );
}

function Progress({ className }: { className?: string }) {
  const p = usePlayer();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="w-11 text-left text-[11px] tabular text-muted-foreground">{fmtTime(p.time)}</span>
      <Slider dir="rtl" value={[p.time]} max={p.duration || 1} step={1} onValueChange={(v) => p.seek(v[0])} className="flex-1 [&_.bg-secondary]:h-1" aria-label="شريط التقدم" data-testid="slider-progress" />
      <span className="w-11 text-[11px] tabular text-muted-foreground">{fmtTime(p.duration)}</span>
    </div>
  );
}

function Controls({ big }: { big?: boolean }) {
  const p = usePlayer();
  return (
    <div className="flex items-center justify-center gap-1">
      <IconBtn label={t("shuffle")} onClick={p.toggleShuffle} active={p.shuffle} testid="button-shuffle">
        <Shuffle className="h-4 w-4" />
      </IconBtn>
      {/* في الواجهة العربية: "السابق" على اليمين */}
      <IconBtn label={t("prev")} onClick={p.prev} testid="button-prev">
        <SkipForward className="h-5 w-5" fill="currentColor" />
      </IconBtn>
      <button
        type="button"
        onClick={p.toggle}
        aria-label={p.playing ? t("pause") : t("play")}
        className={cn("inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow active:scale-95", big ? "h-16 w-16" : "h-11 w-11")}
        data-testid="button-toggle-play"
      >
        {p.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : p.playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 -translate-x-[1px]" fill="currentColor" />}
      </button>
      <IconBtn label={t("next")} onClick={p.next} testid="button-next">
        <SkipBack className="h-5 w-5" fill="currentColor" />
      </IconBtn>
      <IconBtn label={`${t("repeat")}: ${p.repeat === "off" ? "متوقف" : p.repeat === "all" ? "الكل" : "مقطع واحد"}`} onClick={p.cycleRepeat} active={p.repeat !== "off"} testid="button-repeat">
        {p.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
      </IconBtn>
    </div>
  );
}

function Volume() {
  const p = usePlayer();
  return (
    <div className="flex items-center gap-1">
      <IconBtn label={t("volume")} onClick={p.toggleMute} testid="button-mute">
        {p.muted || p.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </IconBtn>
      <Slider dir="rtl" value={[p.muted ? 0 : p.volume]} max={1} step={0.01} onValueChange={(v) => p.setVolume(v[0])} className="w-24 [&_.bg-secondary]:h-1" aria-label={t("volume")} data-testid="slider-volume" />
    </div>
  );
}

function Queue({ onClose }: { onClose: () => void }) {
  const p = usePlayer();
  return (
    <div className="flex max-h-[60vh] flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="font-serif text-lg font-bold">{t("queue")}</p>
        <IconBtn label="إغلاق" onClick={onClose} testid="button-close-queue">
          <X className="h-4 w-4" />
        </IconBtn>
      </div>
      <ol className="overflow-y-auto p-2">
        {p.queue.map((tr, i) => (
          <li key={tr.key + i} className={cn("flex items-center gap-3 rounded-md px-2 py-2", i === p.index && "bg-accent")}>
            <button onClick={() => p.jumpTo(i)} className="flex min-w-0 flex-1 items-center gap-3 text-right" data-testid={`button-queue-${i}`}>
              <span className="w-5 text-xs tabular text-muted-foreground">{i + 1}</span>
              <Art src={tr.image} className="h-10 w-10 shrink-0" />
              <span className="min-w-0">
                <span className={cn("block truncate text-sm", i === p.index && "text-primary font-medium")}>{tr.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{tr.subtitle}</span>
              </span>
            </button>
            {i !== p.index && (
              <IconBtn label="إزالة من القائمة" onClick={() => p.removeAt(i)} className="h-9 w-9" testid={`button-queue-remove-${i}`}>
                <X className="h-3.5 w-3.5" />
              </IconBtn>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Player() {
  const p = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (!p.current) return null;
  const c = p.current;

  if (p.hidden)
    return (
      <button
        onClick={() => p.setHidden(false)}
        className="fixed bottom-4 left-4 z-50 flex h-12 items-center gap-2 rounded-full border border-border bg-popover px-4 text-sm shadow-lg"
        aria-label={t("showPlayer")}
        data-testid="button-show-player"
      >
        {p.playing ? <span className="flex h-3 items-end gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="w-0.5 animate-pulse bg-primary" style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 150}ms` }} />)}</span> : <Music2 className="h-4 w-4 text-primary" />}
        {t("showPlayer")}
      </button>
    );

  return (
    <>
      {/* شريط المشغل الثابت */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/85" data-testid="player-bar" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* مؤشر تقدم رفيع للجوال */}
        <div className="h-0.5 w-full bg-border md:hidden">
          <div className="h-full bg-primary" style={{ width: `${p.duration ? (p.time / p.duration) * 100 : 0}%`, marginInlineStart: 0 }} />
        </div>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 md:h-20 md:px-6">
          <button className="flex min-w-0 flex-1 items-center gap-3 text-right md:w-72 md:flex-none" onClick={() => setExpanded(true)} data-testid="button-expand-player">
            <Art src={c.image} className="h-11 w-11 shrink-0 md:h-12 md:w-12" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground" data-testid="text-player-title">{c.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.error || c.subtitle || "عبد الحليم حافظ"}</span>
            </span>
          </button>
          <div className="hidden flex-1 flex-col md:flex">
            <Controls />
            <Progress className="mt-0.5" />
          </div>
          <div className="hidden items-center md:flex">
            <Volume />
            <IconBtn label={t("queue")} onClick={() => setQueueOpen((v) => !v)} active={queueOpen} testid="button-queue">
              <ListMusic className="h-4 w-4" />
            </IconBtn>
            <IconBtn label={t("hidePlayer")} onClick={() => p.setHidden(true)} testid="button-hide-player">
              <ChevronDown className="h-4 w-4" />
            </IconBtn>
          </div>
          {/* الجوال: أزرار مختصرة */}
          <div className="flex items-center md:hidden">
            <button onClick={p.toggle} aria-label={p.playing ? t("pause") : t("play")} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground" data-testid="button-mobile-toggle">
              {p.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : p.playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
            </button>
            <IconBtn label={t("next")} onClick={p.next} testid="button-mobile-next">
              <SkipBack className="h-5 w-5" fill="currentColor" />
            </IconBtn>
          </div>
        </div>
        {queueOpen && (
          <div className="absolute bottom-full left-4 mb-2 hidden w-96 overflow-hidden rounded-lg border border-border bg-popover shadow-xl md:block">
            <Queue onClose={() => setQueueOpen(false)} />
          </div>
        )}
      </div>

      {/* المشغل الموسّع (للجوال بشكل أساسي) */}
      {expanded && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background" role="dialog" aria-label="المشغل" data-testid="player-expanded" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-between p-2">
            <IconBtn label="تصغير" onClick={() => setExpanded(false)} testid="button-collapse-player">
              <ChevronDown className="h-6 w-6" />
            </IconBtn>
            <p className="text-xs text-muted-foreground">يعمل الآن</p>
            <IconBtn label={t("hidePlayer")} onClick={() => { setExpanded(false); p.setHidden(true); }} testid="button-hide-player-mobile">
              <X className="h-5 w-5" />
            </IconBtn>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6">
            <Art src={c.image} className="aspect-square w-full max-w-xs shadow-2xl" />
            <div className="w-full max-w-md text-center">
              <p className="font-serif text-2xl font-bold">{c.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.error || c.subtitle}</p>
              {c.link && (
                <Link href={c.link} onClick={() => setExpanded(false)} className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline">
                  تفاصيل التسجيل
                </Link>
              )}
            </div>
            <div className="w-full max-w-md">
              <Progress />
              <div className="mt-3">
                <Controls big />
              </div>
              <div className="mt-4 flex justify-center">
                <Volume />
              </div>
            </div>
            <details className="w-full max-w-md rounded-lg border border-border">
              <summary className="flex min-h-[44px] cursor-pointer items-center justify-between px-4 text-sm">
                {t("queue")} ({p.queue.length}) <ChevronUp className="h-4 w-4" />
              </summary>
              <Queue onClose={() => {}} />
            </details>
          </div>
        </div>
      )}
    </>
  );
}
