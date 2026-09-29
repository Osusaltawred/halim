import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

export const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

/** رابط ملف وسائط (MP3 أو صورة). يدعم المسارات المحلية أو روابط خارجية (CDN / S3) */
export function mediaUrl(p?: string | null): string {
  if (!p) return "";
  if (/^https?:\/\//.test(p)) return p;
  return `${API_BASE}/media/${p.split("/").map(encodeURIComponent).join("/")}`;
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  return res.json();
}

export function qs(params: Record<string, any>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}

export function useApi<T = any>(url: string | null) {
  return useQuery<T>({ queryKey: [url], queryFn: () => apiGet<T>(url!), enabled: !!url });
}

export function useInfiniteList(entity: string, params: Record<string, any>, pageSize = 24) {
  return useInfiniteQuery({
    queryKey: ["/api/list", entity, params],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiGet<{ items: any[]; total: number; offset: number }>(`/api/list/${entity}${qs({ ...params, limit: pageSize, offset: pageParam })}`),
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined),
  });
}

// ------------------ الإدارة ------------------
let adminToken = "";
export function setAdminToken(t: string) {
  adminToken = t;
}
export function getAdminToken() {
  return adminToken;
}

export async function adminFetch<T = any>(method: string, url: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

export async function uploadFiles(kind: "audio" | "image", files: FileList | File[], folder = "", onProgress?: (p: number) => void): Promise<{ path: string; name: string }[]> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append("files", f));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/admin/upload${qs({ kind, folder })}`);
    xhr.setRequestHeader("x-admin-token", adminToken);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error(d.message || "فشل الرفع"));
        else resolve(d.files);
      } catch {
        reject(new Error("فشل الرفع"));
      }
    };
    xhr.onerror = () => reject(new Error("فشل الاتصال"));
    xhr.send(fd);
  });
}

export function adminDownloadUrl(path: string) {
  return `${API_BASE}${path}${path.includes("?") ? "&" : "?"}token=${adminToken}`;
}
