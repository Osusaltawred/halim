import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Info } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { DateText } from "./common";
import { optionLabel } from "@shared/registry";
import { cn } from "@/lib/utils";

export function Lightbox({ photos, index, onClose, onIndex }: { photos: any[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const p = photos[index];
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [info, setInfo] = useState(true);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // RTL: السهم الأيسر = التالي
      if (e.key === "ArrowLeft") onIndex(Math.min(photos.length - 1, index + 1));
      if (e.key === "ArrowRight") onIndex(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [index, photos.length]);

  if (!p) return null;
  const links = [
    p.concert && { href: `/concerts/${p.concert}`, label: `حفلة: ${p.concertName}` },
    p.movie && { href: `/movies/${p.movie}`, label: `فيلم: ${p.movieName}` },
    p.session && { href: `/sessions/${p.session}`, label: `جلسة: ${p.sessionName}` },
    p.interview && { href: `/interviews/${p.interview}`, label: `مقابلة: ${p.interviewName}` },
    p.song && { href: `/songs/${p.song}`, label: `أغنية: ${p.songName}` },
    p.person && { href: `/people/${p.person}`, label: p.personName },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true" aria-label="عرض الصورة" data-testid="lightbox">
      <div className="flex items-center justify-between gap-2 p-2">
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="إغلاق" data-testid="button-lightbox-close">
          <X className="h-6 w-6" />
        </button>
        <span className="text-xs tabular text-white/60">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.75))} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="تصغير" data-testid="button-zoom-out">
            <ZoomOut className="h-5 w-5" />
          </button>
          <button onClick={() => setZoom((z) => Math.min(5, z + 0.75))} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="تكبير" data-testid="button-zoom-in">
            <ZoomIn className="h-5 w-5" />
          </button>
          <button onClick={() => setInfo((v) => !v)} className={cn("flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10", info && "bg-white/10")} aria-label="معلومات الصورة" data-testid="button-photo-info">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden"
          onWheel={(e) => setZoom((z) => Math.min(5, Math.max(1, z - e.deltaY * 0.002)))}
          onDoubleClick={() => (zoom > 1 ? (setZoom(1), setPos({ x: 0, y: 0 })) : setZoom(2.5))}
          onPointerDown={(e) => {
            if (zoom <= 1) return;
            drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setPos({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
          }}
          onPointerUp={() => (drag.current = null)}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
              pinch.current = { d, z: zoom };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinch.current) {
              const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
              setZoom(Math.min(5, Math.max(1, pinch.current.z * (d / pinch.current.d))));
            }
          }}
          onTouchEnd={() => (pinch.current = null)}
        >
          <img
            src={mediaUrl(p.file)}
            alt={p.title || "صورة"}
            className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in" }}
            draggable={false}
            data-testid="img-lightbox"
          />
          {index > 0 && (
            <button onClick={() => onIndex(index - 1)} className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-black/70" aria-label="السابقة" data-testid="button-lightbox-prev">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          {index < photos.length - 1 && (
            <button onClick={() => onIndex(index + 1)} className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-black/70" aria-label="التالية" data-testid="button-lightbox-next">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
        </div>
        {info && (
          <aside className="max-h-[38vh] shrink-0 overflow-y-auto border-t border-white/10 p-4 text-sm md:max-h-none md:w-80 md:border-r md:border-t-0">
            <h2 className="font-serif text-xl">{p.title || "صورة بدون عنوان"}</h2>
            <dl className="mt-3 space-y-2 text-white/80">
              <div className="flex justify-between gap-3"><dt className="text-white/50">التاريخ</dt><dd><DateText row={p} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">المكان</dt><dd>{p.place || "غير معروف"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">التصنيف</dt><dd>{optionLabel("photoCategory", p.category) || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">اللون</dt><dd>{optionLabel("colorMode", p.colorMode) || "—"}</dd></div>
              <div><dt className="text-white/50">الأشخاص في الصورة</dt><dd className="mt-0.5 whitespace-pre-line">{p.peopleText || "غير محدد"}</dd></div>
              <div><dt className="text-white/50">المصدر</dt><dd className="mt-0.5">{p.photoSource || "غير محدد"}</dd></div>
              {p.description && <div><dt className="text-white/50">معلومات</dt><dd className="mt-0.5 whitespace-pre-line">{p.description}</dd></div>}
            </dl>
            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} onClick={onClose} className="rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10">
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
