import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, Download, Save, X, Search, Database, FileAudio, FileImage, LogOut, RefreshCw, HardDrive, Link2, Check, AlertTriangle, ChevronsUpDown, Music2, FolderOpen } from "lucide-react";
import { adminFetch, apiGet, qs, uploadFiles, mediaUrl, setAdminToken, adminDownloadUrl } from "@/lib/api";
import { Container, useDebounced } from "@/components/Layout";
import { PageHeader, Spinner, CertaintyBadge, Logo } from "@/components/common";
import { ENTITIES, EntityKey, FieldDef, OPTION_SETS, optionLabel } from "@shared/registry";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// أدوات النموذج
// ------------------------------------------------------------------
const inputCls = "h-12 w-full rounded-md border border-input bg-background px-3 text-[15px] outline-none focus:border-primary";

function RefInput({ field, value, name, onChange }: { field: FieldDef; value: any; name?: string; onChange: (id: any, name?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 200);
  const target = ENTITIES[field.ref!];
  const { data, isFetching } = useQuery({
    queryKey: ["ref", field.ref, dq, open],
    enabled: open,
    queryFn: () => apiGet(`/api/list/${field.ref}${qs({ q: dq, limit: 30, sort: target.dated ? "year" : target.display })}`),
  });
  const label = value ? name || `#${value}` : "";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(inputCls, "flex items-center justify-between text-right")} data-testid={`ref-${field.key}`}>
          <span className={cn("truncate", !label && "text-muted-foreground")}>{label || `اختر ${field.label.ar}`}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-2" align="start">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث أو اكتب اسمًا جديدًا…" className={cn(inputCls, "h-11")} data-testid={`ref-search-${field.key}`} />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {value && (
            <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-2.5 text-sm text-destructive hover:bg-accent">
              <X className="h-4 w-4" /> إزالة الربط
            </button>
          )}
          {isFetching && <Spinner className="m-2 h-4 w-4" />}
          {(data as any)?.items?.map((r: any) => {
            const title = field.ref === "recordings" ? `${r.songInfo?.title ?? ""} ${r.title ?? ""}` : r[target.display];
            return (
              <button key={r.id} type="button" onClick={() => { onChange(r.id, title); setOpen(false); }} className="flex w-full items-center justify-between gap-2 rounded px-2 py-2.5 text-right text-sm hover:bg-accent">
                <span className="truncate">{title}</span>
                {r.year && <span className="text-xs tabular text-muted-foreground">{r.year}</span>}
              </button>
            );
          })}
          {dq && !(data as any)?.items?.some((r: any) => r[target.display] === dq) && (
            <button type="button" onClick={() => { onChange(dq, dq); setOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded border border-dashed border-primary/50 px-2 py-2.5 text-sm text-primary hover:bg-accent" data-testid={`ref-create-${field.key}`}>
              <Plus className="h-4 w-4" /> إضافة «{dq}» كـ{target.label.ar} جديد
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilePicker({ kind, onPick, onClose }: { kind: "audio" | "image"; onPick: (p: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [unlinked, setUnlinked] = useState(true);
  const dq = useDebounced(q, 200);
  const { data, isLoading } = useQuery({ queryKey: ["files", kind, dq, unlinked], queryFn: () => adminFetch("GET", `/api/admin/files${qs({ kind, q: dq, unlinked: unlinked ? "1" : "" })}`) });
  return (
    <div className="mt-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الملفات المرفوعة…" className={cn(inputCls, "h-10")} />
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded hover:bg-accent" aria-label="إغلاق"><X className="h-4 w-4" /></button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={unlinked} onChange={(e) => setUnlinked(e.target.checked)} /> الملفات غير المرتبطة فقط</label>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {isLoading && <Spinner />}
        {(data as any)?.files?.map((f: any) => (
          <button key={f.path} type="button" onClick={() => onPick(f.path)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-right text-xs hover:bg-accent">
            <span className="truncate" dir="ltr">{f.path}</span>
            {f.linked && <span className="text-muted-foreground">مرتبط</span>}
          </button>
        ))}
        {(data as any)?.files?.length === 0 && <p className="p-2 text-xs text-muted-foreground">لا توجد ملفات. ارفع ملفًا أولًا.</p>}
      </div>
    </div>
  );
}

function MediaInput({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const kind = field.type === "audio" ? "audio" : "image";
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [pick, setPick] = useState(false);
  const { toast } = useToast();
  return (
    <div>
      <div className="flex gap-2">
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={kind === "audio" ? "audio/1976/qariat-alfingan.mp3 أو رابط https" : "images/photo.jpg أو رابط https"} className={inputCls} dir="ltr" data-testid={`input-${field.key}`} />
        <input ref={ref} type="file" accept={kind === "audio" ? "audio/*,.mp3" : "image/*"} hidden onChange={async (e) => {
          const f = e.target.files;
          if (!f?.length) return;
          setBusy(0.01);
          try {
            const [res] = await uploadFiles(kind, f, "", setBusy);
            onChange(res.path);
            toast({ title: "تم رفع الملف", description: res.path });
          } catch (err: any) {
            toast({ title: "تعذر الرفع", description: err.message, variant: "destructive" });
          } finally {
            setBusy(0);
            e.target.value = "";
          }
        }} />
        <button type="button" onClick={() => ref.current?.click()} className="flex h-12 shrink-0 items-center gap-1.5 rounded-md bg-secondary px-3 text-sm" data-testid={`button-upload-${field.key}`}>
          {busy ? <span className="tabular">{Math.round(busy * 100)}%</span> : <Upload className="h-4 w-4" />}
          <span className="hidden sm:inline">رفع</span>
        </button>
        <button type="button" onClick={() => setPick((v) => !v)} className="flex h-12 shrink-0 items-center rounded-md border border-border px-3" aria-label="اختيار من الملفات" data-testid={`button-pick-${field.key}`}>
          <FolderOpen className="h-4 w-4" />
        </button>
      </div>
      {pick && <FilePicker kind={kind} onPick={(p) => { onChange(p); setPick(false); }} onClose={() => setPick(false)} />}
      {value && kind === "image" && <img src={mediaUrl(value)} alt="" className="mt-2 h-24 rounded-md object-cover" />}
      {value && kind === "audio" && <audio src={mediaUrl(value)} controls preload="none" className="mt-2 w-full" />}
    </div>
  );
}

function FieldInput({ f, form, set }: { f: FieldDef; form: any; set: (k: string, v: any) => void }) {
  const v = form[f.key];
  switch (f.type) {
    case "textarea":
      return <textarea value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} rows={3} className={cn(inputCls, "h-auto py-2 leading-7")} data-testid={`input-${f.key}`} />;
    case "longtext":
      return <textarea value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} rows={6} className={cn(inputCls, "h-auto py-2 leading-7")} data-testid={`input-${f.key}`} />;
    case "number":
      return <input type="number" inputMode="numeric" value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} className={inputCls} dir="ltr" data-testid={`input-${f.key}`} />;
    case "date":
      return <input value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder="1976-04-26" className={inputCls} dir="ltr" data-testid={`input-${f.key}`} />;
    case "url":
      return <input type="url" value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder="https://" className={inputCls} dir="ltr" data-testid={`input-${f.key}`} />;
    case "bool":
      return (
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3">
          <input type="checkbox" checked={!!v} onChange={(e) => set(f.key, e.target.checked)} className="h-6 w-6 accent-[hsl(var(--primary))]" data-testid={`input-${f.key}`} />
          <span className="text-sm">نعم</span>
        </label>
      );
    case "select":
      return (
        <select value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} className={inputCls} data-testid={`input-${f.key}`}>
          <option value="">— غير محدد —</option>
          {(OPTION_SETS[f.options!] as readonly any[]).map((o) => (
            <option key={o.value} value={o.value}>{o.label.ar}</option>
          ))}
        </select>
      );
    case "tags": {
      const arr: string[] = Array.isArray(v) ? v : [];
      return (
        <div className="flex flex-wrap gap-2">
          {(OPTION_SETS[f.options!] as readonly any[]).map((o) => {
            const on = arr.includes(o.value);
            return (
              <button type="button" key={o.value} onClick={() => set(f.key, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])} className={cn("min-h-[40px] rounded-full border px-3 text-sm", on ? "border-primary bg-primary text-primary-foreground" : "border-border")} data-testid={`tag-${f.key}-${o.value}`}>
                {o.label.ar}
              </button>
            );
          })}
        </div>
      );
    }
    case "ref":
      return <RefInput field={f} value={v} name={form[`${f.key}Name`]} onChange={(id, name) => { set(f.key, id); set(`${f.key}Name`, name); }} />;
    case "audio":
    case "image":
      return <MediaInput field={f} value={v} onChange={(x) => set(f.key, x)} />;
    default:
      return <input value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} className={inputCls} data-testid={`input-${f.key}`} />;
  }
}

const GROUP_LABEL: Record<string, string> = { main: "البيانات الأساسية", date: "التاريخ ودرجة التأكد", links: "الروابط والمكان", media: "الوسائط (MP3 والصور)", notes: "الوصف والملاحظات" };

// ------------------------------------------------------------------
// التوثيق والمصادر لكل عنصر
// ------------------------------------------------------------------
function CitationsEditor({ entity, id }: { entity: EntityKey; id: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["citations", entity, id];
  const { data } = useQuery({ queryKey: key, queryFn: () => apiGet(`/api/list/citations${qs({ entityType: entity, entityId: id, limit: 200, sort: "id" })}`) });
  const [form, setForm] = useState<any>({ field: "general", certainty: "likely" });
  const fields = [{ key: "general", label: { ar: "معلومة عامة" } }, ...ENTITIES[entity].fields.filter((f) => !["image", "audio"].includes(f.type))];
  const srcField = ENTITIES.citations.fields.find((f) => f.key === "source")!;
  const add = async () => {
    if (!form.source) return toast({ title: "اختر المصدر أولًا", variant: "destructive" });
    await adminFetch("POST", "/api/admin/citations", { ...form, entityType: entity, entityId: id });
    setForm({ field: "general", certainty: "likely" });
    qc.invalidateQueries({ queryKey: key });
    toast({ title: "أضيف التوثيق" });
  };
  const del = async (cid: number) => {
    await adminFetch("DELETE", `/api/admin/citations/${cid}`);
    qc.invalidateQueries({ queryKey: key });
  };
  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-2 font-serif text-lg font-bold">المصادر ودرجة التأكد</legend>
      <p className="mb-3 text-xs text-muted-foreground">يمكنك إضافة أكثر من مصدر لكل معلومة. لا تضف معلومة دون مصدر؛ استخدم «غير مؤكد» أو «غير معروف» عند الشك.</p>
      <ul className="mb-3 space-y-2">
        {(data as any)?.items?.map((c: any) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm">
            <span className="min-w-0">
              <span className="text-muted-foreground">{fields.find((f) => f.key === c.field)?.label.ar ?? c.field}: </span>
              {c.sourceName}
              {c.detail && <span className="text-xs text-muted-foreground"> — {c.detail}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <CertaintyBadge value={c.certainty} />
              <button type="button" onClick={() => del(c.id)} className="flex h-9 w-9 items-center justify-center rounded text-destructive hover:bg-accent" aria-label="حذف التوثيق"><Trash2 className="h-4 w-4" /></button>
            </span>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">المعلومة
          <select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className={cn(inputCls, "mt-1")} data-testid="select-citation-field">
            {fields.map((f) => <option key={f.key} value={f.key}>{f.label.ar}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">درجة التأكد
          <select value={form.certainty} onChange={(e) => setForm({ ...form, certainty: e.target.value })} className={cn(inputCls, "mt-1")} data-testid="select-citation-certainty">
            {OPTION_SETS.certainty.map((o) => <option key={o.value} value={o.value}>{o.label.ar}</option>)}
          </select>
        </label>
        <div className="text-xs text-muted-foreground">المصدر (اختر أو أضف جديدًا)
          <div className="mt-1"><RefInput field={srcField} value={form.source} name={form.sourceName} onChange={(sid, n) => setForm({ ...form, source: sid, sourceName: n })} /></div>
        </div>
        <label className="text-xs text-muted-foreground">الصفحة / الاقتباس
          <input value={form.detail ?? ""} onChange={(e) => setForm({ ...form, detail: e.target.value })} className={cn(inputCls, "mt-1")} data-testid="input-citation-detail" />
        </label>
      </div>
      <button type="button" onClick={add} className="mt-3 flex min-h-[44px] items-center gap-2 rounded-md border border-primary/50 px-4 text-sm text-primary hover:bg-primary/10" data-testid="button-add-citation">
        <Plus className="h-4 w-4" /> إضافة توثيق
      </button>
    </fieldset>
  );
}

// ------------------------------------------------------------------
// نموذج الإضافة / التعديل
// ------------------------------------------------------------------
export function EntityForm({ entity, initial, onClose, onSaved }: { entity: EntityKey; initial?: any; onClose: () => void; onSaved: (row: any) => void }) {
  const def = ENTITIES[entity];
  const [form, setForm] = useState<any>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(initial?.id ?? null);
  const { toast } = useToast();
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const groups = useMemo(() => {
    const g: Record<string, FieldDef[]> = {};
    def.fields.forEach((f) => (g[f.group ?? "main"] ??= []).push(f));
    return Object.entries(g);
  }, [entity]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      def.fields.forEach((f) => {
        let v = form[f.key];
        // مراجع جديدة تُرسل بالاسم وينشئها الخادم تلقائيًا
        if (f.type === "ref" && typeof v === "string" && !/^\d+$/.test(v)) payload[`${f.key}Name`] = v, (v = "");
        payload[f.key] = v ?? "";
      });
      const row = savedId ? await adminFetch("PUT", `/api/admin/${entity}/${savedId}`, payload) : await adminFetch("POST", `/api/admin/${entity}`, payload);
      setSavedId(row.id);
      setForm(row);
      onSaved(row);
      toast({ title: "تم الحفظ", description: `${def.label.ar}: ${row[def.display] ?? ""}` });
    } catch (e: any) {
      toast({ title: "تعذر الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex justify-end bg-black/50" role="dialog" aria-modal="true" aria-label={`${savedId ? "تعديل" : "إضافة"} ${def.label.ar}`}>
      <div className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-xl font-bold">{savedId ? "تعديل" : "إضافة"} {def.label.ar}</h2>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent" aria-label="إغلاق" data-testid="button-close-form"><X className="h-5 w-5" /></button>
        </div>
        <form className="flex-1 space-y-6 overflow-y-auto p-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {groups.map(([g, fields]) => (
            <fieldset key={g} className="space-y-4">
              <legend className="mb-2 text-xs font-semibold tracking-wide text-primary">{GROUP_LABEL[g]}</legend>
              {g === "date" && <p className="-mt-1 text-xs text-muted-foreground">إذا لم يكن التاريخ معروفًا اترك السنة فارغة واختر «غير معروف». للتقدير استخدم «من سنة / إلى سنة» (مثل 1965 – 1967) وسيُعرض كتقدير.</p>}
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-sm font-medium">
                    {f.label.ar} {f.required && <span className="text-destructive">*</span>}
                  </label>
                  <FieldInput f={f} form={form} set={set} />
                  {f.help?.ar && <p className="mt-1 text-xs text-muted-foreground">{f.help.ar}</p>}
                </div>
              ))}
            </fieldset>
          ))}
          {savedId && entity !== "citations" && entity !== "sources" && <CitationsEditor entity={entity} id={savedId} />}
          {!savedId && entity !== "citations" && <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">بعد الحفظ الأول ستظهر هنا خانة إضافة المصادر ودرجة التأكد.</p>}
          <button type="submit" hidden />
        </form>
        <div className="flex gap-2 border-t border-border p-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <button onClick={save} disabled={saving} className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-60" data-testid="button-save">
            {saving ? <Spinner className="text-primary-foreground" /> : <Save className="h-5 w-5" />} حفظ
          </button>
          <button onClick={onClose} className="min-h-[52px] rounded-md border border-border px-5" data-testid="button-cancel">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// إدارة نوع بيانات
// ------------------------------------------------------------------
function EntityManager({ entity }: { entity: EntityKey }) {
  const def = ENTITIES[entity];
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim());
  const [limit, setLimit] = useState(50);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-list", entity, dq, limit],
    queryFn: () => apiGet(`/api/list/${entity}${qs({ q: dq, limit, sort: "recent" })}`),
  });
  const listFields = def.fields.filter((f) => f.list).slice(0, 4);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-list", entity] });
    qc.invalidateQueries({ predicate: (qq) => String(qq.queryKey[0]).startsWith("/api") });
  };
  const cell = (row: any, f: FieldDef) => {
    const v = row[f.key];
    if (f.type === "ref") return row[`${f.key}Name`] || "—";
    if (f.type === "select") return optionLabel(f.options, v) || "—";
    if (f.type === "tags") return (v ?? []).map((x: string) => optionLabel(f.options, x)).join("، ") || "—";
    if (f.type === "audio") return v ? <span className="inline-flex items-center gap-1 text-primary"><FileAudio className="h-3.5 w-3.5" /> متوفر</span> : <span className="text-muted-foreground">لا يوجد</span>;
    if (f.type === "image") return v ? <img src={mediaUrl(v)} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" /> : "—";
    return v ?? "—";
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`بحث في ${def.plural.ar}…`} className={cn(inputCls, "pr-9")} data-testid="input-admin-search" />
        </div>
        <button onClick={() => setEditing({})} className="flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground" data-testid={`button-add-${entity}`}>
          <Plus className="h-5 w-5" /> إضافة {def.label.ar}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{(data as any)?.total ?? 0} عنصر</p>
      <div className="mt-2 overflow-hidden rounded-lg border border-card-border bg-card">
        {isLoading ? <div className="p-6"><Spinner /></div> : (
          <ul className="divide-y divide-border/60">
            {(data as any)?.items?.map((row: any) => (
              <li key={row.id} className="flex items-center gap-3 p-3" data-testid={`admin-row-${entity}-${row.id}`}>
                <span className="w-10 shrink-0 text-xs tabular text-muted-foreground">#{row.id}</span>
                <button onClick={() => setEditing(row)} className="min-w-0 flex-1 text-right">
                  <p className="truncate font-medium">{entity === "recordings" ? `${row.songInfo?.title ?? row.songName ?? ""} ${row.title ? `— ${row.title}` : ""}` : row[def.display] || "بدون عنوان"}</p>
                  <p className="flex flex-wrap gap-x-3 truncate text-xs text-muted-foreground">
                    {listFields.filter((f) => f.key !== def.display).map((f) => (
                      <span key={f.key} className="inline-flex items-center gap-1">{f.label.ar}: {cell(row, f)}</span>
                    ))}
                  </p>
                </button>
                <button onClick={() => setEditing(row)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-accent" aria-label="تعديل" data-testid={`button-edit-${row.id}`}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setConfirmDel(row)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-accent" aria-label="حذف" data-testid={`button-delete-${row.id}`}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!(data as any)?.items?.length && <li className="p-6 text-center text-sm text-muted-foreground">لا توجد عناصر بعد.</li>}
          </ul>
        )}
      </div>
      {(data as any)?.total > limit && (
        <button onClick={() => setLimit((l) => l + 50)} className="mt-3 w-full rounded-md border border-border py-3 text-sm hover:bg-accent" data-testid="button-admin-more">تحميل المزيد</button>
      )}
      {editing && <EntityForm entity={entity} initial={editing.id ? editing : undefined} onClose={() => setEditing(null)} onSaved={refresh} />}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف هذا العنصر؟</AlertDialogTitle>
            <AlertDialogDescription>سيُحذف السجل من قاعدة البيانات مع توثيقاته. الملفات الصوتية والصور نفسها لن تُحذف من مجلد الوسائط.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                await adminFetch("DELETE", `/api/admin/${entity}/${confirmDel.id}`);
                toast({ title: "تم الحذف" });
                setConfirmDel(null);
                refresh();
              }}
              data-testid="button-confirm-delete"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ------------------------------------------------------------------
// الملفات: رفع جماعي + ربط
// ------------------------------------------------------------------
function FilesManager() {
  const [kind, setKind] = useState<"audio" | "image">("audio");
  const [folder, setFolder] = useState("");
  const [progress, setProgress] = useState(0);
  const [unlinked, setUnlinked] = useState(true);
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);
  const [newRec, setNewRec] = useState<any | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery({ queryKey: ["files", kind, dq, unlinked, "mgr"], queryFn: () => adminFetch("GET", `/api/admin/files${qs({ kind, q: dq, unlinked: unlinked ? "1" : "" })}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["files"] });

  const guessTitle = (p: string) => p.split("/").pop()!.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s\d+$/, "").trim();

  const makePhotos = async (paths: string[]) => {
    for (const p of paths) await adminFetch("POST", "/api/admin/photos", { file: p, title: guessTitle(p) });
    toast({ title: `أُضيفت ${paths.length} صورة إلى المعرض`, description: "أكمل بياناتها (التاريخ، المكان، المصدر) من تبويب الصور." });
    refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => setKind("audio")} className={cn("flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md border", kind === "audio" ? "border-primary bg-primary/10 text-primary" : "border-border")} data-testid="button-kind-audio"><FileAudio className="h-4 w-4" /> ملفات MP3</button>
        <button onClick={() => setKind("image")} className={cn("flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md border", kind === "image" ? "border-primary bg-primary/10 text-primary" : "border-border")} data-testid="button-kind-image"><FileImage className="h-4 w-4" /> الصور</button>
      </div>
      <div className="rounded-lg border-2 border-dashed border-border p-5 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          if (!e.dataTransfer.files.length) return;
          const res = await uploadFiles(kind, e.dataTransfer.files, folder, setProgress);
          setProgress(0);
          toast({ title: `تم رفع ${res.length} ملف` });
          refresh();
        }}>
        <Upload className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-2 text-sm">اسحب الملفات هنا أو اضغط للاختيار — يمكنك رفع مئات الملفات دفعة واحدة</p>
        <div className="mx-auto mt-3 flex max-w-md flex-col gap-2 sm:flex-row">
          <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="مجلد فرعي اختياري، مثل 1976 أو concerts/1976" className={cn(inputCls, "h-11")} dir="ltr" data-testid="input-upload-folder" />
          <button onClick={() => input.current?.click()} className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground" data-testid="button-bulk-upload">
            {progress ? `${Math.round(progress * 100)}%` : "اختيار الملفات"}
          </button>
        </div>
        <input ref={input} type="file" multiple hidden accept={kind === "audio" ? "audio/*,.mp3" : "image/*"} onChange={async (e) => {
          const f = e.target.files;
          if (!f?.length) return;
          try {
            const res = await uploadFiles(kind, f, folder, setProgress);
            toast({ title: `تم رفع ${res.length} ملف`, description: kind === "audio" ? "اربط كل ملف بتسجيل من القائمة أدناه." : "يمكنك إضافتها للمعرض مباشرة." });
            refresh();
          } catch (err: any) {
            toast({ title: "تعذر الرفع", description: err.message, variant: "destructive" });
          } finally {
            setProgress(0);
            e.target.value = "";
          }
        }} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث باسم الملف…" className={cn(inputCls, "h-11")} />
        <label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={unlinked} onChange={(e) => setUnlinked(e.target.checked)} className="h-5 w-5" /> غير المرتبطة فقط</label>
        {kind === "image" && (data as any)?.files?.some((f: any) => !f.linked) && (
          <button onClick={() => makePhotos((data as any).files.filter((f: any) => !f.linked).map((f: any) => f.path))} className="min-h-[44px] shrink-0 rounded-md border border-primary/50 px-3 text-sm text-primary" data-testid="button-all-to-gallery">
            إضافة كل غير المرتبطة للمعرض
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">إجمالي الملفات: {(data as any)?.total ?? 0}</p>
      <ul className="divide-y divide-border/60 rounded-lg border border-card-border bg-card">
        {isLoading && <li className="p-4"><Spinner /></li>}
        {(data as any)?.files?.map((f: any) => (
          <li key={f.path} className="flex items-center gap-3 p-3">
            {kind === "image" ? <img src={mediaUrl(f.path)} alt="" className="h-12 w-12 shrink-0 rounded object-cover" loading="lazy" /> : <Music2 className="h-5 w-5 shrink-0 text-primary" />}
            <span className="min-w-0 flex-1 truncate text-sm" dir="ltr">{f.path}</span>
            {f.linked ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> مرتبط</span>
            ) : kind === "audio" ? (
              <button onClick={() => setNewRec({ audioFile: f.path, songName: guessTitle(f.path), song: guessTitle(f.path) })} className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-md border border-primary/50 px-3 text-xs text-primary" data-testid="button-link-audio">
                <Link2 className="h-3.5 w-3.5" /> إنشاء تسجيل
              </button>
            ) : (
              <button onClick={() => makePhotos([f.path])} className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-md border border-primary/50 px-3 text-xs text-primary" data-testid="button-link-image">
                <Plus className="h-3.5 w-3.5" /> للمعرض
              </button>
            )}
          </li>
        ))}
        {(data as any)?.files?.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">لا توجد ملفات هنا.</li>}
      </ul>
      {newRec && <EntityForm key={newRec.audioFile} entity="recordings" initial={newRec} onClose={() => { setNewRec(null); refresh(); }} onSaved={refresh} />}
    </div>
  );
}

// ------------------------------------------------------------------
// الاستيراد والتصدير
// ------------------------------------------------------------------
function ImportExport() {
  const [entity, setEntity] = useState<EntityKey | "">("songs");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const file = useRef<HTMLInputElement>(null);
  const importable = (Object.keys(ENTITIES) as EntityKey[]);
  const run = async (f: File) => {
    setBusy(true);
    setResult(null);
    try {
      const content = await f.text();
      const format = /\.json$/i.test(f.name) ? "json" : "csv";
      const res = await adminFetch("POST", "/api/admin/import", { entity: entity || undefined, format, content });
      setResult(res);
      qc.invalidateQueries();
      toast({ title: "اكتمل الاستيراد" });
    } catch (e: any) {
      toast({ title: "تعذر الاستيراد", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-card-border bg-card p-4">
        <h3 className="font-serif text-xl font-bold">استيراد بيانات كثيرة دفعة واحدة</h3>
        <ol className="mt-2 list-decimal space-y-1 pr-5 text-sm text-muted-foreground">
          <li>نزّل قالب CSV للنوع المطلوب، واملأه في Excel أو Google Sheets (احفظه بترميز UTF-8).</li>
          <li>في أعمدة الربط (مثل composer أو song أو concert) يمكنك كتابة الاسم نصًا — سيُربط تلقائيًا أو يُنشأ إن لم يكن موجودًا.</li>
          <li>في عمود audioFile اكتب مسار الملف داخل مجلد الوسائط، مثل audio/1976/qariat.mp3.</li>
          <li>وجود رقم في عمود id يعني تحديث السجل الموجود بدل إنشاء نسخة جديدة.</li>
        </ol>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <select value={entity} onChange={(e) => setEntity(e.target.value as any)} className={inputCls} data-testid="select-import-entity">
            <option value="">نسخة كاملة (ملف JSON مُصدَّر من الأرشيف)</option>
            {importable.map((k) => <option key={k} value={k}>{ENTITIES[k].plural.ar}</option>)}
          </select>
          {entity && (
            <a href={adminDownloadUrl(`/api/admin/template/${entity}`)} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm" data-testid="link-template">
              <Download className="h-4 w-4" /> قالب CSV
            </a>
          )}
          <button onClick={() => file.current?.click()} disabled={busy} className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground" data-testid="button-import">
            {busy ? <Spinner className="text-primary-foreground" /> : <Upload className="h-4 w-4" />} اختيار ملف CSV / JSON
          </button>
          <input ref={file} type="file" hidden accept=".csv,.json,text/csv,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ""; }} />
        </div>
        {result && (
          <pre className="mt-4 max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr" data-testid="text-import-result">{JSON.stringify(result, null, 2)}</pre>
        )}
      </section>
      <section className="rounded-lg border border-card-border bg-card p-4">
        <h3 className="font-serif text-xl font-bold">تصدير</h3>
        <p className="mt-1 text-sm text-muted-foreground">ملف JSON الكامل يحتوي كل البيانات والإعدادات، ويمكن استيراده لاحقًا لاستعادة الأرشيف على أي خادم.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={adminDownloadUrl("/api/admin/export/all")} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground" data-testid="link-export-all">
            <Download className="h-4 w-4" /> تصدير كامل JSON
          </a>
          {importable.map((k) => (
            <a key={k} href={adminDownloadUrl(`/api/admin/export/${k}`)} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-1 rounded-md border border-border px-3 text-xs" data-testid={`link-export-${k}`}>
              {ENTITIES[k].plural.ar} CSV
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------
// الإعدادات والنسخ الاحتياطي
// ------------------------------------------------------------------
function SettingsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: stats } = useQuery({ queryKey: ["/api/stats"], queryFn: () => apiGet("/api/stats") });
  const { data: info, refetch } = useQuery({ queryKey: ["admin-info"], queryFn: () => adminFetch("GET", "/api/admin/info") });
  const [s, setS] = useState<any>(null);
  useEffect(() => { if ((stats as any)?.settings && !s) setS((stats as any).settings); }, [stats]);
  const heroField: FieldDef = { key: "heroImage", type: "image", label: { ar: "الصورة الرئيسية", en: "" } };
  const save = async () => {
    await adminFetch("PUT", "/api/admin/settings", s);
    qc.invalidateQueries({ queryKey: ["/api/stats"] });
    toast({ title: "حُفظت الإعدادات" });
  };
  const i: any = info;
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-card-border bg-card p-4">
        <h3 className="font-serif text-xl font-bold">الصفحة الرئيسية</h3>
        {s && (
          <div className="mt-3 space-y-4">
            <div><label className="mb-1 block text-sm font-medium">صورة عبد الحليم الرئيسية (ارفع صورة تملك حق استخدامها)</label><MediaInput field={heroField} value={s.heroImage} onChange={(v) => setS({ ...s, heroImage: v })} /></div>
            <div><label className="mb-1 block text-sm font-medium">تعليق الصورة / مصدرها</label><input value={s.heroCaption ?? ""} onChange={(e) => setS({ ...s, heroCaption: e.target.value })} className={inputCls} data-testid="input-hero-caption" /></div>
            <div><label className="mb-1 block text-sm font-medium">النبذة المختصرة</label><textarea value={s.bio ?? ""} onChange={(e) => setS({ ...s, bio: e.target.value })} rows={5} className={cn(inputCls, "h-auto py-2 leading-7")} data-testid="input-bio" /></div>
            <button onClick={save} className="flex min-h-[48px] items-center gap-2 rounded-md bg-primary px-5 text-primary-foreground" data-testid="button-save-settings"><Save className="h-4 w-4" /> حفظ الإعدادات</button>
          </div>
        )}
      </section>
      <section className="rounded-lg border border-card-border bg-card p-4">
        <h3 className="flex items-center gap-2 font-serif text-xl font-bold"><HardDrive className="h-5 w-5 text-primary" /> التخزين والنسخ الاحتياطي</h3>
        {i && (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">مجلد البيانات (منفصل عن كود الموقع)</dt><dd className="break-all" dir="ltr">{i.dataDir}</dd></div>
            <div className="rounded-md bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">قاعدة البيانات</dt><dd dir="ltr">{(i.dbSize / 1024).toFixed(0)} KB</dd></div>
            <div className="rounded-md bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">ملفات صوتية</dt><dd className="tabular">{i.audioFiles}</dd></div>
            <div className="rounded-md bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">صور</dt><dd className="tabular">{i.imageFiles}</dd></div>
          </dl>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={async () => { const r = await adminFetch("POST", "/api/admin/backup"); toast({ title: "أُنشئت نسخة احتياطية", description: r.name }); refetch(); }} className="flex min-h-[48px] items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground" data-testid="button-backup">
            <Database className="h-4 w-4" /> إنشاء نسخة احتياطية الآن
          </button>
          <button onClick={async () => { await adminFetch("POST", "/api/admin/reindex"); toast({ title: "أُعيد بناء فهرس البحث" }); }} className="flex min-h-[48px] items-center gap-2 rounded-md border border-border px-4 text-sm" data-testid="button-reindex">
            <RefreshCw className="h-4 w-4" /> إعادة بناء فهرس البحث
          </button>
        </div>
        {i?.backups?.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {i.backups.map((b: string) => (
              <li key={b} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-3 py-2">
                <span dir="ltr" className="truncate text-xs">{b}</span>
                <a href={adminDownloadUrl(`/api/admin/backup-file/${b}`)} target="_blank" rel="noopener noreferrer" className="flex min-h-[40px] items-center gap-1 text-xs text-primary"><Download className="h-3.5 w-3.5" /> تنزيل</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Overview({ go }: { go: (t: string) => void }) {
  const { data } = useQuery({ queryKey: ["/api/stats"], queryFn: () => apiGet("/api/stats") });
  const c = (data as any)?.counts ?? {};
  const quick: [string, string][] = [["songs", "إضافة أغنية"], ["recordings", "إضافة تسجيل / MP3"], ["concerts", "إضافة حفلة"], ["interviews", "إضافة مقابلة"], ["sessions", "إضافة جلسة"], ["photos", "إضافة صورة"]];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["songs", "recordings", "audio", "concerts", "interviews", "sessions", "movies", "photos", "people", "sources", "citations", "events"] as string[]).map((k) => (
          <div key={k} className="rounded-lg border border-card-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{k === "audio" ? "ملفات صوتية مرتبطة" : ENTITIES[k as EntityKey]?.plural.ar}</p>
            <p className="font-serif text-3xl font-bold tabular">{c[k] ?? 0}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">إضافة سريعة</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quick.map(([k, l]) => (
            <button key={k} onClick={() => go(k)} className="flex min-h-[56px] items-center justify-center gap-2 rounded-md border border-border bg-card text-sm hover:border-primary/60" data-testid={`button-quick-${k}`}>
              <Plus className="h-4 w-4 text-primary" /> {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
const TABS: { key: string; label: string }[] = [
  { key: "overview", label: "نظرة عامة" },
  { key: "songs", label: "الأغاني" },
  { key: "recordings", label: "التسجيلات و MP3" },
  { key: "concerts", label: "الحفلات" },
  { key: "sessions", label: "الجلسات" },
  { key: "interviews", label: "المقابلات" },
  { key: "movies", label: "الأفلام" },
  { key: "photos", label: "الصور" },
  { key: "people", label: "الملحنون والشعراء" },
  { key: "events", label: "أحداث الخط الزمني" },
  { key: "sources", label: "المصادر" },
  { key: "citations", label: "كل التوثيقات" },
  { key: "files", label: "رفع الملفات" },
  { key: "import", label: "استيراد وتصدير" },
  { key: "settings", label: "الإعدادات والنسخ الاحتياطي" },
];

export default function Admin() {
  const [token, setToken] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [defaultPwd, setDefaultPwd] = useState(false);
  const [tab, setTab] = useState("overview");

  if (!token)
    return (
      <Container className="max-w-md py-16">
        <div className="text-center text-primary"><Logo className="mx-auto h-14 w-14" /></div>
        <h1 className="mt-4 text-center font-serif text-3xl font-bold">لوحة التحكم</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">خاصة بصاحب الأرشيف لإضافة وتعديل المواد.</p>
        <form className="mt-6 space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          try {
            const r = await adminFetch("POST", "/api/admin/login", { password: pwd });
            setAdminToken(r.token);
            setDefaultPwd(r.defaultPassword);
            setToken(r.token);
          } catch (e: any) { setErr(e.message); }
        }}>
          <label className="block text-sm font-medium" htmlFor="pwd">كلمة المرور</label>
          <input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className={inputCls} autoComplete="current-password" data-testid="input-password" />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button className="flex min-h-[52px] w-full items-center justify-center rounded-md bg-primary font-medium text-primary-foreground" data-testid="button-login">دخول</button>
        </form>
      </Container>
    );

  const isEntity = tab in ENTITIES;
  return (
    <Container>
      <PageHeader eyebrow="إدارة الأرشيف" title="لوحة التحكم" actions={
        <button onClick={() => { setToken(""); setAdminToken(""); }} className="flex min-h-[44px] items-center gap-2 rounded-md border border-border px-3 text-sm" data-testid="button-logout"><LogOut className="h-4 w-4" /> خروج</button>
      } />
      {defaultPwd && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>تستخدم كلمة المرور الافتراضية. غيّرها عند النشر عبر متغير البيئة ADMIN_PASSWORD (التفاصيل في دليل المشروع).</span>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="أقسام لوحة التحكم">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn("min-h-[44px] shrink-0 whitespace-nowrap rounded-md px-3 text-right text-sm", tab === t.key ? "bg-accent font-medium text-primary" : "hover:bg-accent/60")} data-testid={`tab-${t.key}`}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          <h2 className="mb-4 font-serif text-2xl font-bold">{TABS.find((t) => t.key === tab)?.label}</h2>
          {tab === "overview" && <Overview go={setTab} />}
          {isEntity && <EntityManager key={tab} entity={tab as EntityKey} />}
          {tab === "files" && <FilesManager />}
          {tab === "import" && <ImportExport />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
    </Container>
  );
}
