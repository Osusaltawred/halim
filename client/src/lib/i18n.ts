/**
 * نصوص الواجهة. لإضافة لغة جديدة (مثل الإنجليزية) أكمل القاموس en
 * ثم غيّر LANG. لا حاجة لإعادة بناء الموقع من الصفر.
 */
import type { Lang } from "@shared/registry";

export const LANG: Lang = "ar";
export const DIR = LANG === "ar" ? "rtl" : "ltr";

const ar = {
  siteName: "أرشيف عبد الحليم حافظ",
  siteShort: "أرشيف العندليب",
  home: "الرئيسية",
  songs: "الأغاني",
  concerts: "الحفلات",
  interviews: "المقابلات",
  sessions: "الجلسات",
  photos: "الصور",
  timeline: "الخط الزمني",
  archive: "الأرشيف",
  rare: "التسجيلات النادرة",
  movies: "الأفلام",
  people: "الملحنون والشعراء",
  admin: "لوحة التحكم",
  searchPlaceholder: "ابحث عن أغنية، ملحن، شاعر، سنة، حفلة، مدينة…",
  searchAll: "عرض كل النتائج",
  noResults: "لا توجد نتائج مطابقة",
  journey: "رحلة عبد الحليم حافظ",
  allOfYear: "كل مواد عام",
  loadMore: "تحميل المزيد",
  play: "تشغيل",
  pause: "إيقاف مؤقت",
  next: "التالي",
  prev: "السابق",
  shuffle: "تشغيل عشوائي",
  repeat: "تكرار",
  queue: "قائمة التشغيل",
  hidePlayer: "إخفاء المشغل",
  showPlayer: "إظهار المشغل",
  volume: "مستوى الصوت",
  noAudio: "الملف الصوتي غير متوفر بعد",
  oldestFirst: "من الأقدم إلى الأحدث",
  newestFirst: "من الأحدث إلى الأقدم",
  sortBy: "ترتيب حسب",
  all: "الكل",
  sources: "المصادر والتوثيق",
  otherVersions: "نسخ أخرى من الأغنية",
  needsData: "بيانات تحتاج إلى إدخال",
  dateUncertain: "التاريخ غير مؤكد",
  estimateNote: "تقدير وليس حقيقة مؤكدة",
  theme: "تبديل المظهر",
};

export type TKey = keyof typeof ar;
const en: Partial<Record<TKey, string>> = {
  siteName: "Abdel Halim Hafez Archive",
  songs: "Songs",
  concerts: "Concerts",
};

const dict: Record<Lang, Partial<Record<TKey, string>>> = { ar, en };
export function t(k: TKey): string {
  return dict[LANG][k] ?? ar[k];
}
