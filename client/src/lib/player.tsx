import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { mediaUrl } from "./api";

export interface Track {
  key: string; // e.g. rec-12
  title: string;
  subtitle?: string;
  audioFile: string;
  image?: string | null;
  link?: string;
}

type Repeat = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  hidden: boolean;
  loading: boolean;
  error: string;
  playQueue: (tracks: Track[], start?: number) => void;
  playTrack: (t: Track) => void;
  addToQueue: (t: Track) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setHidden: (h: boolean) => void;
  jumpTo: (i: number) => void;
  removeAt: (i: number) => void;
  isCurrent: (key: string) => boolean;
}

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  // عنصر صوت واحد لكامل التطبيق — لذلك يستمر التشغيل أثناء التنقل بين الصفحات
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "none"; // لا يحمّل أي ملف قبل التشغيل
  }
  const audio = audioRef.current!;

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVol] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stateRef = useRef({ queue, index, shuffle, repeat });
  stateRef.current = { queue, index, shuffle, repeat };

  const current = index >= 0 ? queue[index] ?? null : null;

  const load = useCallback(
    (t: Track) => {
      setError("");
      setLoading(true);
      audio.src = mediaUrl(t.audioFile);
      audio.currentTime = 0;
      audio.play().catch(() => setLoading(false));
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title,
            artist: "عبد الحليم حافظ",
            album: t.subtitle || "",
            artwork: t.image ? [{ src: mediaUrl(t.image), sizes: "512x512" }] : [],
          });
        } catch {}
      }
    },
    [audio],
  );

  const goto = useCallback(
    (i: number, q?: Track[]) => {
      const list = q ?? stateRef.current.queue;
      if (i < 0 || i >= list.length) return;
      setIndex(i);
      load(list[i]);
    },
    [load],
  );

  const next = useCallback(() => {
    const { queue: q, index: i, shuffle: sh, repeat: rp } = stateRef.current;
    if (!q.length) return;
    if (sh && q.length > 1) {
      let n = i;
      while (n === i) n = Math.floor(Math.random() * q.length);
      return goto(n);
    }
    if (i + 1 < q.length) goto(i + 1);
    else if (rp === "all") goto(0);
    else {
      audio.pause();
    }
  }, [goto, audio]);

  const prev = useCallback(() => {
    if (audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    const { index: i, queue: q, repeat: rp } = stateRef.current;
    if (i > 0) goto(i - 1);
    else if (rp === "all" && q.length) goto(q.length - 1);
    else audio.currentTime = 0;
  }, [goto, audio]);

  useEffect(() => {
    const on = (e: string, f: any) => audio.addEventListener(e, f);
    const off = (e: string, f: any) => audio.removeEventListener(e, f);
    const h = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      timeupdate: () => setTime(audio.currentTime),
      durationchange: () => setDuration(isFinite(audio.duration) ? audio.duration : 0),
      loadedmetadata: () => setDuration(isFinite(audio.duration) ? audio.duration : 0),
      waiting: () => setLoading(true),
      playing: () => setLoading(false),
      canplay: () => setLoading(false),
      error: () => {
        setLoading(false);
        setPlaying(false);
        setError("تعذر تشغيل الملف. تأكد من وجوده في مجلد الوسائط.");
      },
      ended: () => {
        if (stateRef.current.repeat === "one") {
          audio.currentTime = 0;
          audio.play();
        } else next();
      },
    };
    Object.entries(h).forEach(([e, f]) => on(e, f));
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("nexttrack", next);
        navigator.mediaSession.setActionHandler("previoustrack", prev);
        navigator.mediaSession.setActionHandler("play", () => audio.play());
        navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      } catch {}
    }
    return () => Object.entries(h).forEach(([e, f]) => off(e, f));
  }, [audio, next, prev]);

  useEffect(() => {
    audio.volume = volume;
    audio.muted = muted;
  }, [audio, volume, muted]);

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      index,
      current,
      playing,
      time,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      hidden,
      loading,
      error,
      playQueue: (tracks, start = 0) => {
        const list = tracks.filter((t) => t.audioFile);
        if (!list.length) return;
        setQueue(list);
        setHidden(false);
        goto(Math.min(start, list.length - 1), list);
      },
      playTrack: (t) => {
        const { queue: q } = stateRef.current;
        const found = q.findIndex((x) => x.key === t.key);
        setHidden(false);
        if (found >= 0) return goto(found);
        const nq = [...q, t];
        setQueue(nq);
        goto(nq.length - 1, nq);
      },
      addToQueue: (t) => setQueue((q) => (q.some((x) => x.key === t.key) ? q : [...q, t])),
      toggle: () => {
        if (!current) return;
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
      },
      next,
      prev,
      seek: (s) => {
        audio.currentTime = s;
        setTime(s);
      },
      setVolume: (v) => {
        setVol(v);
        if (v > 0) setMuted(false);
      },
      toggleMute: () => setMuted((m) => !m),
      toggleShuffle: () => setShuffle((s) => !s),
      cycleRepeat: () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
      setHidden,
      jumpTo: (i) => goto(i),
      removeAt: (i) => {
        setQueue((q) => q.filter((_, j) => j !== i));
        setIndex((cur) => (i < cur ? cur - 1 : cur));
      },
      isCurrent: (key) => current?.key === key,
    }),
    [queue, index, current, playing, time, duration, volume, muted, shuffle, repeat, hidden, loading, error, goto, next, prev, audio],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("PlayerProvider missing");
  return c;
}

export function fmtTime(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return h ? `${h}:${m.toString().padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** تحويل تسجيل من قاعدة البيانات إلى مقطع قابل للتشغيل */
export function recToTrack(r: any, song?: any): Track | null {
  if (!r?.audioFile) return null;
  const s = song ?? r.songInfo ?? {};
  const title = s.title || r.songName || r.title || "تسجيل";
  const bits = [r.title, r.year || (r.date ? String(r.date).slice(0, 4) : ""), r.concertName].filter(Boolean);
  return {
    key: `rec-${r.id}`,
    title,
    subtitle: bits.join(" · "),
    audioFile: r.audioFile,
    image: r.image || s.image || null,
    link: `/recordings/${r.id}`,
  };
}
