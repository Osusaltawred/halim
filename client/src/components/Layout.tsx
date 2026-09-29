import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Sun, Moon, Settings2, Music, Mic2, Users, Image as ImageIcon, Clock, Archive, Film, Radio, Disc3, Home, PenLine } from "lucide-react";
import { useApi, qs } from "@/lib/api";
import { usePlayer } from "@/lib/player";
import { Logo, Spinner, DateText } from "./common";
import { ENTITIES, EntityKey } from "@shared/registry";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: t("home"), icon: Home },
  { href: "/songs", label: t("songs"), icon: Music },
  { href: "/concerts", label: t("concerts"), icon: Mic2 },
  { href: "/interviews", label: t("interviews"), icon: Radio },
  { href: "/sessions", label: t("sessions"), icon: Disc3 },
  { href: "/photos", label: t("photos"), icon: ImageIcon },
  { href: "/timeline", label: t("timeline"), icon: Clock },
  { href: "/archive", label: t("archive"), icon: Archive },
  { href: "/rare", label: t("rare"), icon: Disc3 },
  { href: "/movies", label: t("movies"), icon: Film },
  { href: "/people", label: t("people"), icon: PenLine },
];

export function useDebounced<T>(v: T, ms = 220) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

export function entityHref(e: string, row: any) {
  switch (e) {
    case "songs": return `/songs/${row.id}`;
    case "recordings": return `/recordings/${row.id}`;
    case "concerts": return `/concerts/${row.id}`;
    case "sessions": return `/sessions/${row.id}`;
    case "interviews": return `/interviews/${row.id}`;
    case "movies": return `/movies/${row.id}`;
    case "people": return `/people/${row.id}`;
    case "photos": return `/photos/${row.id}`;
    case "events": return row.year ? `/timeline/${row.year}` : "/timeline";
    default: return "/";
  }
}

export function entityTitle(e: string, row: any) {
  if (e === "recordings") return `${row.songInfo?.title ?? row.songName ?? "تسجيل"}${row.title ? ` — ${row.title}` : ""}`;
  const d = ENTITIES[e as EntityKey];
  return row[d?.display ?? "title"] || "بدون عنوان";
}

const GROUP_ORDER = ["songs", "recordings", "concerts", "movies", "people", "interviews", "sessions", "photos", "events", "sources"];

/** شريط البحث الفوري — يعمل أثناء الكتابة */
export function LiveSearch({ autoFocus, onDone, big }: { autoFocus?: boolean; onDone?: () => void; big?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const dq = useDebounced(q.trim());
  const [, nav] = useLocation();
  const { data, isFetching } = useApi<any>(dq ? `/api/search${qs({ q: dq, per: 4 })}` : null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const go = (href: string) => {
    setOpen(false);
    setQ("");
    onDone?.();
    nav(href);
  };
  const groups = data?.groups ? GROUP_ORDER.filter((g) => data.groups[g]) : [];
  return (
    <div ref={box} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(`/search/${encodeURIComponent(q.trim())}`);
        }}
        className={cn("flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 focus-within:border-primary/70", big ? "h-14 text-base" : "h-11 text-sm")}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("searchPlaceholder")}
          className="h-full w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/80"
          aria-label="بحث في الأرشيف"
          data-testid="input-search"
        />
        {isFetching && <Spinner className="h-4 w-4" />}
      </form>
      {open && dq && data && (
        <div className="absolute inset-x-0 top-full z-[60] mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-2xl" data-testid="panel-search-results">
          {data.year && (
            <button onClick={() => go(`/timeline/${data.year}`)} className="mb-1 flex w-full items-center justify-between rounded-md bg-primary/10 px-3 py-2.5 text-sm text-primary" data-testid="button-search-year">
              <span>كل مواد أرشيف عام {data.year}</span>
              <Clock className="h-4 w-4" />
            </button>
          )}
          {!groups.length && <p className="p-4 text-center text-sm text-muted-foreground">{t("noResults")}</p>}
          {groups.map((g) => (
            <div key={g} className="py-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground">
                {ENTITIES[g as EntityKey].plural.ar} <span className="tabular">({data.groups[g].total})</span>
              </p>
              {data.groups[g].items.map((row: any) => (
                <button key={row.id} onClick={() => go(entityHref(g, row))} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-right text-sm hover:bg-accent" data-testid={`result-${g}-${row.id}`}>
                  <span className="truncate">{entityTitle(g, row)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ENTITIES[g as EntityKey].dated ? <DateText row={row} showBadge={false} /> : row.roles?.length ? "" : ""}</span>
                </button>
              ))}
            </div>
          ))}
          {groups.length > 0 && (
            <button onClick={() => go(`/search/${encodeURIComponent(dq)}`)} className="mt-1 w-full rounded-md border border-border py-2.5 text-sm text-primary hover:bg-accent" data-testid="button-search-all">
              {t("searchAll")} ({data.total})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const p = usePlayer();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    setMenu(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0 });
  }, [loc.split("?")[0]]);
  const isHome = loc === "/" || loc === "";
  const active = (href: string) => (href === "/" ? isHome : loc.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }} className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2">
        تخطَّ إلى المحتوى
      </a>
      <header className={cn("sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75")}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 text-primary" data-testid="link-home">
            <Logo className="h-9 w-9" />
            <span className="hidden leading-tight sm:block">
              <span className="block font-serif text-lg font-bold text-foreground">{t("siteName")}</span>
              <span className="block text-[11px] text-muted-foreground">مكتبة صوتية ومتحف رقمي</span>
            </span>
          </Link>
          <div className="mx-auto hidden w-full max-w-md lg:block">{!isHome && <LiveSearch />}</div>
          <div className="ms-auto flex items-center gap-1 lg:ms-0">
            <button onClick={() => setSearchOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent lg:hidden" aria-label="بحث" data-testid="button-open-search">
              <Search className="h-5 w-5" />
            </button>
            <button onClick={() => setDark((d) => !d)} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent" aria-label={t("theme")} data-testid="button-theme">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link href="/admin" className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent" aria-label={t("admin")} data-testid="link-admin">
              <Settings2 className="h-5 w-5" />
            </Link>
            <button onClick={() => setMenu(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent xl:hidden" aria-label="القائمة" data-testid="button-menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-4 pb-2 xl:flex xl:px-6" aria-label="التنقل الرئيسي">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors", active(n.href) ? "bg-accent text-primary" : "text-foreground/75 hover:text-foreground")} data-testid={`link-nav-${n.href.slice(1) || "home"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-[65] bg-background/98 p-4" role="dialog" aria-label="بحث">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-serif text-xl font-bold">البحث في الأرشيف</p>
            <button onClick={() => setSearchOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent" aria-label="إغلاق" data-testid="button-close-search">
              <X className="h-5 w-5" />
            </button>
          </div>
          <LiveSearch autoFocus big onDone={() => setSearchOpen(false)} />
        </div>
      )}

      {menu && (
        <div className="fixed inset-0 z-[65] flex" role="dialog" aria-label="القائمة">
          <div className="flex-1 bg-black/50" onClick={() => setMenu(false)} />
          <nav className="flex w-[82%] max-w-xs flex-col overflow-y-auto border-r border-border bg-background p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary"><Logo className="h-8 w-8" /><span className="font-serif text-lg font-bold text-foreground">{t("siteShort")}</span></span>
              <button onClick={() => setMenu(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent" aria-label="إغلاق" data-testid="button-close-menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn("flex min-h-[48px] items-center gap-3 rounded-md px-3 text-base", active(n.href) ? "bg-accent text-primary" : "hover:bg-accent")} data-testid={`link-menu-${n.href.slice(1) || "home"}`}>
                <n.icon className="h-5 w-5 opacity-70" />
                {n.label}
              </Link>
            ))}
            <Link href="/admin" className="mt-2 flex min-h-[48px] items-center gap-3 rounded-md border border-border px-3" data-testid="link-menu-admin">
              <Settings2 className="h-5 w-5 opacity-70" /> {t("admin")}
            </Link>
          </nav>
        </div>
      )}

      <main id="main" tabIndex={-1} className={cn("flex-1 outline-none", p.current && !p.hidden && "pb-20 md:pb-24")}>
        {children}
      </main>

      <footer className={cn("border-t border-border/70 py-8 text-sm text-muted-foreground", p.current && !p.hidden && "mb-16 md:mb-20")}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-2 text-primary">
            <Logo className="h-7 w-7" />
            <span className="font-serif text-base text-foreground">{t("siteName")}</span>
          </div>
          <p className="max-w-xl text-xs leading-6">كل معلومة في الأرشيف مرفقة بمصدرها ودرجة التأكد منها. المواد الصوتية والصور تُضاف فقط من ملفات يملك صاحب الأرشيف حق استخدامها.</p>
        </div>
      </footer>
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10", className)}>{children}</div>;
}
