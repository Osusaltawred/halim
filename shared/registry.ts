/**
 * سجل الكيانات (Entity Registry)
 * ------------------------------------------------------------
 * هذا الملف هو "مصدر الحقيقة" لبنية قاعدة البيانات بالكامل.
 * - الخادم يستخدمه لإنشاء الجداول تلقائيًا، وإضافة الأعمدة الجديدة
 *   دون حذف أي بيانات (Migration تلقائي آمن).
 * - الواجهة تستخدمه لبناء نماذج لوحة التحكم تلقائيًا.
 *
 * لإضافة حقل جديد مستقبلًا: أضفه هنا فقط، ثم أعد تشغيل الخادم.
 * سيُضاف العمود إلى قاعدة البيانات تلقائيًا دون المساس بالبيانات الموجودة.
 */

export type Lang = "ar" | "en";
export type L10n = { ar: string; en: string };

export type FieldType =
  | "text"
  | "textarea"
  | "longtext"
  | "number"
  | "date"
  | "select"
  | "tags"
  | "ref"
  | "audio"
  | "image"
  | "url"
  | "bool";

export interface FieldDef {
  key: string;
  type: FieldType;
  label: L10n;
  options?: OptionSetKey;
  ref?: EntityKey;
  required?: boolean;
  /** يظهر في جدول لوحة التحكم */
  list?: boolean;
  help?: L10n;
  group?: "main" | "date" | "links" | "media" | "notes";
}

export type EntityKey =
  | "songs"
  | "recordings"
  | "concerts"
  | "sessions"
  | "interviews"
  | "movies"
  | "photos"
  | "people"
  | "sources"
  | "citations"
  | "events";

export interface EntityDef {
  key: EntityKey;
  label: L10n;
  plural: L10n;
  display: string; // الحقل المستخدم كعنوان
  dated: boolean;
  fields: FieldDef[];
  /** رابط صفحة العرض العامة */
  route?: string;
}

// ------------------------------------------------------------------
// مجموعات الخيارات
// ------------------------------------------------------------------
export const OPTION_SETS = {
  certainty: [
    { value: "confirmed", label: { ar: "مؤكد", en: "Confirmed" } },
    { value: "likely", label: { ar: "مرجح", en: "Likely" } },
    { value: "uncertain", label: { ar: "غير مؤكد", en: "Uncertain" } },
    { value: "unknown", label: { ar: "غير معروف", en: "Unknown" } },
  ],
  songCategory: [
    { value: "romantic", label: { ar: "أغنية عاطفية", en: "Romantic" } },
    { value: "national", label: { ar: "أغنية وطنية", en: "National" } },
    { value: "religious", label: { ar: "أغنية دينية", en: "Religious" } },
    { value: "qasida", label: { ar: "قصيدة", en: "Qasida" } },
    { value: "muwashshah", label: { ar: "موشح", en: "Muwashshah" } },
    { value: "film", label: { ar: "أغنية سينمائية", en: "Film song" } },
    { value: "other", label: { ar: "أخرى", en: "Other" } },
  ],
  recordingType: [
    { value: "studio", label: { ar: "تسجيل استوديو", en: "Studio" } },
    { value: "live", label: { ar: "تسجيل حي", en: "Live" } },
    { value: "radio", label: { ar: "تسجيل إذاعي", en: "Radio" } },
    { value: "film", label: { ar: "نسخة سينمائية", en: "Film" } },
    { value: "tv", label: { ar: "تسجيل تلفزيوني", en: "TV" } },
    { value: "rehearsal", label: { ar: "بروفة", en: "Rehearsal" } },
    { value: "session", label: { ar: "جلسة خاصة", en: "Private session" } },
    { value: "private", label: { ar: "تسجيل خاص", en: "Private" } },
    { value: "incomplete", label: { ar: "تسجيل غير مكتمل", en: "Incomplete" } },
    { value: "other", label: { ar: "أخرى", en: "Other" } },
  ],
  rareCategory: [
    { value: "radio", label: { ar: "تسجيلات إذاعية", en: "Radio" } },
    { value: "rehearsal", label: { ar: "بروفات", en: "Rehearsals" } },
    { value: "session", label: { ar: "جلسات", en: "Sessions" } },
    { value: "private", label: { ar: "تسجيلات خاصة", en: "Private" } },
    { value: "incomplete", label: { ar: "تسجيلات غير مكتملة", en: "Incomplete" } },
    { value: "concert", label: { ar: "تسجيلات حفلات", en: "Concerts" } },
    { value: "studio", label: { ar: "تسجيلات استوديو", en: "Studio" } },
    { value: "undated", label: { ar: "تسجيلات غير مؤرخة", en: "Undated" } },
  ],
  photoCategory: [
    { value: "personal", label: { ar: "صور شخصية", en: "Personal" } },
    { value: "childhood", label: { ar: "صور الطفولة", en: "Childhood" } },
    { value: "concerts", label: { ar: "صور الحفلات", en: "Concerts" } },
    { value: "studio", label: { ar: "صور الاستوديو", en: "Studio" } },
    { value: "films", label: { ar: "صور الأفلام", en: "Films" } },
    { value: "artists", label: { ar: "صور مع الفنانين", en: "With artists" } },
    { value: "composers", label: { ar: "مع الملحنين والشعراء", en: "With composers & poets" } },
    { value: "rare", label: { ar: "صور نادرة", en: "Rare" } },
    { value: "press", label: { ar: "صور الصحافة", en: "Press" } },
    { value: "travel", label: { ar: "صور من السفر", en: "Travel" } },
  ],
  colorMode: [
    { value: "bw", label: { ar: "أبيض وأسود", en: "Black & white" } },
    { value: "color", label: { ar: "ملونة", en: "Color" } },
  ],
  personRole: [
    { value: "composer", label: { ar: "ملحن", en: "Composer" } },
    { value: "lyricist", label: { ar: "شاعر / مؤلف", en: "Lyricist" } },
    { value: "arranger", label: { ar: "موزع", en: "Arranger" } },
    { value: "director", label: { ar: "مخرج", en: "Director" } },
    { value: "actor", label: { ar: "ممثل", en: "Actor" } },
    { value: "musician", label: { ar: "عازف", en: "Musician" } },
    { value: "host", label: { ar: "مذيع / محاور", en: "Host" } },
    { value: "other", label: { ar: "أخرى", en: "Other" } },
  ],
  sourceType: [
    { value: "book", label: { ar: "كتاب", en: "Book" } },
    { value: "newspaper", label: { ar: "صحيفة", en: "Newspaper" } },
    { value: "magazine", label: { ar: "مجلة", en: "Magazine" } },
    { value: "radio", label: { ar: "إذاعة", en: "Radio" } },
    { value: "tv", label: { ar: "تلفزيون", en: "TV" } },
    { value: "record", label: { ar: "أسطوانة / إصدار صوتي", en: "Record release" } },
    { value: "archive", label: { ar: "أرشيف", en: "Archive" } },
    { value: "website", label: { ar: "موقع إلكتروني", en: "Website" } },
    { value: "interview", label: { ar: "مقابلة / شهادة", en: "Interview" } },
    { value: "other", label: { ar: "أخرى", en: "Other" } },
  ],
  eventType: [
    { value: "life", label: { ar: "حياة شخصية", en: "Life" } },
    { value: "career", label: { ar: "مسيرة فنية", en: "Career" } },
    { value: "song", label: { ar: "أغنية", en: "Song" } },
    { value: "film", label: { ar: "فيلم", en: "Film" } },
    { value: "concert", label: { ar: "حفلة", en: "Concert" } },
    { value: "recording", label: { ar: "تسجيل", en: "Recording" } },
    { value: "interview", label: { ar: "مقابلة", en: "Interview" } },
    { value: "other", label: { ar: "أخرى", en: "Other" } },
  ],
  entityType: [] as { value: string; label: L10n }[], // تملأ لاحقًا
} as const satisfies Record<string, readonly { value: string; label: L10n }[]>;

export type OptionSetKey = keyof typeof OPTION_SETS;

// ------------------------------------------------------------------
// حقول التاريخ المشتركة (تدعم التاريخ غير المؤكد والنطاق التقديري)
// ------------------------------------------------------------------
const dateFields = (): FieldDef[] => [
  { key: "year", type: "number", label: { ar: "السنة", en: "Year" }, list: true, group: "date" },
  {
    key: "date",
    type: "date",
    label: { ar: "التاريخ الكامل", en: "Full date" },
    help: { ar: "بصيغة YYYY-MM-DD أو YYYY-MM. اتركه فارغًا إن لم يكن معروفًا.", en: "YYYY-MM-DD or YYYY-MM" },
    group: "date",
  },
  {
    key: "dateCertainty",
    type: "select",
    options: "certainty",
    label: { ar: "درجة التأكد من التاريخ", en: "Date certainty" },
    group: "date",
  },
  {
    key: "yearFrom",
    type: "number",
    label: { ar: "تقدير: من سنة", en: "Estimated from" },
    help: { ar: "للتواريخ غير المؤكدة فقط، مثل: يرجح أنه بين 1965 و1967", en: "" },
    group: "date",
  },
  { key: "yearTo", type: "number", label: { ar: "تقدير: إلى سنة", en: "Estimated to" }, group: "date" },
  { key: "dateNote", type: "text", label: { ar: "ملاحظة على التاريخ", en: "Date note" }, group: "date" },
];

const t = (ar: string, en: string): L10n => ({ ar, en });

export const ENTITIES: Record<EntityKey, EntityDef> = {
  songs: {
    key: "songs",
    label: t("أغنية", "Song"),
    plural: t("الأغاني", "Songs"),
    display: "title",
    dated: true,
    route: "/songs",
    fields: [
      { key: "title", type: "text", label: t("اسم الأغنية", "Title"), required: true, list: true, group: "main" },
      { key: "altTitles", type: "text", label: t("أسماء أخرى / مطلع", "Alternate titles"), group: "main" },
      { key: "category", type: "select", options: "songCategory", label: t("نوع الأغنية", "Category"), list: true, group: "main" },
      { key: "composer", type: "ref", ref: "people", label: t("الملحن", "Composer"), list: true, group: "links" },
      { key: "lyricist", type: "ref", ref: "people", label: t("الشاعر / المؤلف", "Lyricist"), list: true, group: "links" },
      { key: "arranger", type: "ref", ref: "people", label: t("الموزع", "Arranger"), group: "links" },
      { key: "movie", type: "ref", ref: "movies", label: t("الفيلم", "Film"), group: "links" },
      ...dateFields(),
      { key: "image", type: "image", label: t("صورة الأغنية", "Image"), group: "media" },
      { key: "lyrics", type: "longtext", label: t("الكلمات أو مقطع منها (للبحث)", "Lyrics"), group: "notes" },
      { key: "description", type: "textarea", label: t("الوصف", "Description"), group: "notes" },
      { key: "notes", type: "textarea", label: t("ملاحظات تاريخية", "Historical notes"), group: "notes" },
    ],
  },
  recordings: {
    key: "recordings",
    label: t("تسجيل", "Recording"),
    plural: t("التسجيلات", "Recordings"),
    display: "title",
    dated: true,
    route: "/recordings",
    fields: [
      { key: "song", type: "ref", ref: "songs", label: t("الأغنية", "Song"), required: true, list: true, group: "main" },
      { key: "title", type: "text", label: t("وصف النسخة", "Version label"), help: t("مثل: نسخة حفلة شم النسيم", ""), list: true, group: "main" },
      { key: "recordingType", type: "select", options: "recordingType", label: t("نوع التسجيل", "Recording type"), list: true, group: "main" },
      { key: "audioFile", type: "audio", label: t("ملف MP3", "MP3 file"), list: true, group: "media" },
      { key: "duration", type: "text", label: t("مدة التسجيل", "Duration"), help: t("مثل 42:10 — تُحسب تلقائيًا عند التشغيل إن تُركت فارغة", ""), group: "main" },
      { key: "isRare", type: "bool", label: t("تسجيل نادر", "Rare"), group: "main" },
      { key: "rareCategory", type: "select", options: "rareCategory", label: t("تصنيف النادر", "Rare category"), group: "main" },
      ...dateFields(),
      { key: "place", type: "text", label: t("مكان التسجيل", "Place"), group: "links" },
      { key: "city", type: "text", label: t("المدينة", "City"), group: "links" },
      { key: "country", type: "text", label: t("الدولة", "Country"), group: "links" },
      { key: "concert", type: "ref", ref: "concerts", label: t("الحفلة", "Concert"), group: "links" },
      { key: "session", type: "ref", ref: "sessions", label: t("الجلسة", "Session"), group: "links" },
      { key: "movie", type: "ref", ref: "movies", label: t("الفيلم", "Film"), group: "links" },
      { key: "arranger", type: "ref", ref: "people", label: t("الموزع في هذه النسخة", "Arranger"), group: "links" },
      { key: "orderInEvent", type: "number", label: t("الترتيب داخل الحفلة/الجلسة", "Order in event"), group: "links" },
      { key: "recordingSource", type: "text", label: t("مصدر التسجيل", "Recording source"), help: t("مثل: أرشيف الإذاعة، أسطوانة، شريط خاص", ""), group: "media" },
      { key: "image", type: "image", label: t("صورة", "Image"), group: "media" },
      { key: "notes", type: "textarea", label: t("ملاحظات", "Notes"), group: "notes" },
    ],
  },
  concerts: {
    key: "concerts",
    label: t("حفلة", "Concert"),
    plural: t("الحفلات", "Concerts"),
    display: "title",
    dated: true,
    route: "/concerts",
    fields: [
      { key: "title", type: "text", label: t("عنوان الحفلة", "Title"), required: true, list: true, group: "main" },
      { key: "occasion", type: "text", label: t("المناسبة", "Occasion"), list: true, group: "main" },
      ...dateFields(),
      { key: "venue", type: "text", label: t("المكان", "Venue"), group: "links" },
      { key: "city", type: "text", label: t("المدينة", "City"), list: true, group: "links" },
      { key: "country", type: "text", label: t("الدولة", "Country"), group: "links" },
      { key: "image", type: "image", label: t("صورة الغلاف", "Cover image"), group: "media" },
      { key: "videoUrl", type: "url", label: t("رابط فيديو", "Video URL"), group: "media" },
      { key: "description", type: "textarea", label: t("الوصف", "Description"), group: "notes" },
      { key: "history", type: "textarea", label: t("معلومات تاريخية", "History"), group: "notes" },
    ],
  },
  sessions: {
    key: "sessions",
    label: t("جلسة", "Session"),
    plural: t("الجلسات الخاصة", "Private sessions"),
    display: "title",
    dated: true,
    route: "/sessions",
    fields: [
      { key: "title", type: "text", label: t("عنوان الجلسة", "Title"), required: true, list: true, group: "main" },
      ...dateFields(),
      { key: "place", type: "text", label: t("المكان", "Place"), list: true, group: "links" },
      { key: "city", type: "text", label: t("المدينة", "City"), group: "links" },
      { key: "attendees", type: "textarea", label: t("الأشخاص الموجودون", "Attendees"), group: "links" },
      { key: "image", type: "image", label: t("صورة", "Image"), group: "media" },
      { key: "description", type: "textarea", label: t("الوصف", "Description"), group: "notes" },
      { key: "notes", type: "textarea", label: t("ملاحظات", "Notes"), group: "notes" },
    ],
  },
  interviews: {
    key: "interviews",
    label: t("مقابلة", "Interview"),
    plural: t("المقابلات", "Interviews"),
    display: "title",
    dated: true,
    route: "/interviews",
    fields: [
      { key: "title", type: "text", label: t("عنوان المقابلة", "Title"), required: true, list: true, group: "main" },
      { key: "program", type: "text", label: t("البرنامج أو الجهة", "Program / outlet"), list: true, group: "main" },
      { key: "host", type: "text", label: t("المذيع / المحاور", "Host"), list: true, group: "main" },
      { key: "duration", type: "text", label: t("المدة", "Duration"), group: "main" },
      ...dateFields(),
      { key: "place", type: "text", label: t("المكان", "Place"), group: "links" },
      { key: "audioFile", type: "audio", label: t("التسجيل الصوتي", "Audio"), group: "media" },
      { key: "videoUrl", type: "url", label: t("رابط فيديو", "Video URL"), group: "media" },
      { key: "image", type: "image", label: t("صورة", "Image"), group: "media" },
      { key: "description", type: "textarea", label: t("وصف المقابلة", "Description"), group: "notes" },
      { key: "notes", type: "textarea", label: t("ملاحظات", "Notes"), group: "notes" },
    ],
  },
  movies: {
    key: "movies",
    label: t("فيلم", "Film"),
    plural: t("الأفلام", "Films"),
    display: "title",
    dated: true,
    route: "/movies",
    fields: [
      { key: "title", type: "text", label: t("اسم الفيلم", "Title"), required: true, list: true, group: "main" },
      { key: "director", type: "text", label: t("المخرج", "Director"), list: true, group: "main" },
      { key: "cast", type: "textarea", label: t("الأبطال", "Cast"), group: "main" },
      ...dateFields(),
      { key: "poster", type: "image", label: t("الملصق / صورة", "Poster"), group: "media" },
      { key: "videoUrl", type: "url", label: t("رابط وسائط", "Media URL"), group: "media" },
      { key: "mediaLinks", type: "textarea", label: t("روابط وملفات إضافية", "Extra media links"), group: "media" },
      { key: "plot", type: "textarea", label: t("القصة", "Plot"), group: "notes" },
      { key: "history", type: "textarea", label: t("معلومات تاريخية", "History"), group: "notes" },
    ],
  },
  photos: {
    key: "photos",
    label: t("صورة", "Photo"),
    plural: t("الصور", "Photos"),
    display: "title",
    dated: true,
    route: "/photos",
    fields: [
      { key: "file", type: "image", label: t("ملف الصورة", "Image file"), required: true, list: true, group: "media" },
      { key: "title", type: "text", label: t("عنوان / وصف قصير", "Title"), list: true, group: "main" },
      { key: "category", type: "select", options: "photoCategory", label: t("التصنيف", "Category"), list: true, group: "main" },
      { key: "colorMode", type: "select", options: "colorMode", label: t("اللون", "Color"), group: "main" },
      ...dateFields(),
      { key: "place", type: "text", label: t("مكان الالتقاط", "Place"), group: "links" },
      { key: "peopleText", type: "textarea", label: t("الأشخاص في الصورة", "People in photo"), group: "links" },
      { key: "person", type: "ref", ref: "people", label: t("ربط بشخص", "Linked person"), group: "links" },
      { key: "concert", type: "ref", ref: "concerts", label: t("ربط بحفلة", "Linked concert"), group: "links" },
      { key: "session", type: "ref", ref: "sessions", label: t("ربط بجلسة", "Linked session"), group: "links" },
      { key: "interview", type: "ref", ref: "interviews", label: t("ربط بمقابلة", "Linked interview"), group: "links" },
      { key: "movie", type: "ref", ref: "movies", label: t("ربط بفيلم", "Linked film"), group: "links" },
      { key: "song", type: "ref", ref: "songs", label: t("ربط بأغنية", "Linked song"), group: "links" },
      { key: "photoSource", type: "text", label: t("مصدر الصورة", "Photo source"), group: "notes" },
      { key: "description", type: "textarea", label: t("معلومات الصورة", "Details"), group: "notes" },
    ],
  },
  people: {
    key: "people",
    label: t("شخص", "Person"),
    plural: t("الملحنون والشعراء", "Collaborators"),
    display: "name",
    dated: false,
    route: "/people",
    fields: [
      { key: "name", type: "text", label: t("الاسم", "Name"), required: true, list: true, group: "main" },
      { key: "roles", type: "tags", options: "personRole", label: t("الأدوار", "Roles"), list: true, group: "main" },
      { key: "birthYear", type: "number", label: t("سنة الميلاد", "Birth year"), group: "main" },
      { key: "deathYear", type: "number", label: t("سنة الوفاة", "Death year"), group: "main" },
      { key: "image", type: "image", label: t("صورة", "Image"), group: "media" },
      { key: "bio", type: "textarea", label: t("نبذة", "Bio"), group: "notes" },
      { key: "collaboration", type: "textarea", label: t("معلومات عن التعاون مع عبد الحليم", "About the collaboration"), group: "notes" },
    ],
  },
  sources: {
    key: "sources",
    label: t("مصدر", "Source"),
    plural: t("المصادر", "Sources"),
    display: "title",
    dated: false,
    fields: [
      { key: "title", type: "text", label: t("عنوان المصدر", "Title"), required: true, list: true, group: "main" },
      { key: "sourceType", type: "select", options: "sourceType", label: t("نوع المصدر", "Type"), list: true, group: "main" },
      { key: "author", type: "text", label: t("المؤلف / الجهة", "Author"), group: "main" },
      { key: "publisher", type: "text", label: t("الناشر", "Publisher"), group: "main" },
      { key: "pubYear", type: "text", label: t("سنة النشر", "Year"), group: "main" },
      { key: "url", type: "url", label: t("الرابط", "URL"), group: "main" },
      { key: "notes", type: "textarea", label: t("ملاحظات", "Notes"), group: "notes" },
    ],
  },
  citations: {
    key: "citations",
    label: t("توثيق", "Citation"),
    plural: t("التوثيقات", "Citations"),
    display: "field",
    dated: false,
    fields: [
      { key: "entityType", type: "select", options: "entityType", label: t("نوع العنصر", "Entity type"), required: true, list: true, group: "main" },
      { key: "entityId", type: "number", label: t("رقم العنصر", "Entity ID"), required: true, list: true, group: "main" },
      { key: "field", type: "text", label: t("المعلومة الموثقة", "Field"), help: t("مثل: date أو composer أو general", ""), list: true, group: "main" },
      { key: "source", type: "ref", ref: "sources", label: t("المصدر", "Source"), list: true, group: "main" },
      { key: "certainty", type: "select", options: "certainty", label: t("درجة التأكد", "Certainty"), list: true, group: "main" },
      { key: "detail", type: "text", label: t("الصفحة / الاقتباس", "Page / quote"), group: "notes" },
      { key: "note", type: "textarea", label: t("ملاحظة", "Note"), group: "notes" },
    ],
  },
  events: {
    key: "events",
    label: t("حدث", "Event"),
    plural: t("أحداث الخط الزمني", "Timeline events"),
    display: "title",
    dated: true,
    fields: [
      { key: "title", type: "text", label: t("عنوان الحدث", "Title"), required: true, list: true, group: "main" },
      { key: "eventType", type: "select", options: "eventType", label: t("نوع الحدث", "Type"), list: true, group: "main" },
      { key: "milestone", type: "bool", label: t("محطة رئيسية (تظهر في رحلة عبد الحليم)", "Milestone"), group: "main" },
      ...dateFields(),
      { key: "song", type: "ref", ref: "songs", label: t("أغنية مرتبطة", "Related song"), group: "links" },
      { key: "concert", type: "ref", ref: "concerts", label: t("حفلة مرتبطة", "Related concert"), group: "links" },
      { key: "movie", type: "ref", ref: "movies", label: t("فيلم مرتبط", "Related film"), group: "links" },
      { key: "image", type: "image", label: t("صورة", "Image"), group: "media" },
      { key: "description", type: "textarea", label: t("الوصف", "Description"), group: "notes" },
    ],
  },
};

(OPTION_SETS.entityType as any).push(
  ...Object.values(ENTITIES)
    .filter((e) => e.key !== "citations")
    .map((e) => ({ value: e.key, label: e.label })),
);

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

export function optionLabel(set: OptionSetKey | undefined, value: any, lang: Lang = "ar"): string {
  if (!set || value == null || value === "") return "";
  const o = (OPTION_SETS[set] as readonly any[]).find((x) => x.value === value);
  return o ? o.label[lang] : String(value);
}

export const PLACEHOLDER = "بيانات تحتاج إلى إدخال";
