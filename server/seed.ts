/**
 * بيانات أولية محدودة — تُضاف مرة واحدة فقط عند أول تشغيل (قاعدة بيانات فارغة).
 * لا تُعاد إضافتها أبدًا بعد ذلك، ولا تمس بياناتك عند إعادة النشر.
 *
 * كل معلومة هنا مأخوذة من مصادر منشورة ومرفقة بتوثيق ودرجة تأكد.
 * ما لم يُعرف تُرك فارغًا أو وُسم بـ "بيانات تحتاج إلى إدخال".
 * لا توجد أي ملفات صوتية أو صور محمية ضمن هذه البيانات.
 */
import { db, insertRow, getMeta, setMeta, setSetting, reindexAll, findOrCreateByName } from "./db";

export function seedIfEmpty() {
  if (getMeta("seeded")) return;
  const count = (db.prepare(`SELECT COUNT(*) AS c FROM songs`).get() as any).c;
  if (count > 0) {
    setMeta("seeded", "existing-data");
    return;
  }

  const tx = db.transaction(() => {
    const AR = insertRow("sources", {
      title: "ويكيبيديا العربية — عبد الحليم حافظ",
      sourceType: "website",
      author: "ويكيبيديا",
      url: "https://ar.wikipedia.org/wiki/عبد_الحليم_حافظ",
      notes: "مصدر ثانوي. يُستحسن استبداله أو دعمه بمصادر أولية (صحف، أرشيف الإذاعة، إصدارات أصلية).",
    }).id;
    const EN = insertRow("sources", {
      title: "Wikipedia (English) — Abdel Halim Hafez",
      sourceType: "website",
      author: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Abdel_Halim_Hafez",
      notes: "مصدر ثانوي. تختلف بعض تواريخ عرض الأفلام فيه عن النسخة العربية.",
    }).id;

    const cite = (entityType: string, entityId: number, field: string, source: number, certainty: string, detail = "", note = "") =>
      insertRow("citations", { entityType, entityId, field, source, certainty, detail, note });

    const person = (name: string, roles: string[]) => {
      const id = findOrCreateByName("people", name)!;
      db.prepare(`UPDATE people SET roles = ? WHERE id = ?`).run(JSON.stringify(roles), id);
      return id;
    };

    const P = {
      mougy: person("محمد الموجي", ["composer"]),
      baligh: person("بليغ حمدي", ["composer"]),
      wahab: person("محمد عبد الوهاب", ["composer"]),
      taweel: person("كمال الطويل", ["composer"]),
      nizar: person("نزار قباني", ["lyricist"]),
      hamza: person("محمد حمزة", ["lyricist"]),
      mahgoub: person("سمير محجوب", ["lyricist"]),
      mali: person("محمد علي أحمد", ["lyricist"]),
      hussein: person("حسين السيد", ["lyricist"]),
      morsi: person("مرسي جميل عزيز", ["lyricist"]),
      jahin: person("صلاح جاهين", ["lyricist"]),
      sabour: person("صلاح عبد الصبور", ["lyricist"]),
    };

    // ---------------- الأفلام (السنة والمخرج من ويكيبيديا العربية) ----------------
    const films: [string, number, string][] = [
      ["لحن الوفاء", 1955, "إبراهيم عمارة"],
      ["أيامنا الحلوة", 1955, "حلمي حليم"],
      ["ليالي الحب", 1955, "حلمي رفلة"],
      ["أيام وليالي", 1955, "هنري بركات"],
      ["موعد غرام", 1956, "هنري بركات"],
      ["دليلة", 1956, "محمد كريم"],
      ["بنات اليوم", 1957, "هنري بركات"],
      ["الوسادة الخالية", 1957, "صلاح أبو سيف"],
      ["فتى أحلامي", 1957, "حلمي رفلة"],
      ["شارع الحب", 1958, "عز الدين ذو الفقار"],
      ["حكاية حب", 1959, "حلمي حليم"],
      ["البنات والصيف", 1960, "فطين عبد الوهاب"],
      ["يوم من عمري", 1961, "عاطف سالم"],
      ["الخطايا", 1962, "حسن الإمام"],
      ["معبودة الجماهير", 1967, "حلمي رفلة"],
      ["أبي فوق الشجرة", 1969, "حسين كمال"],
    ];
    const M: Record<string, number> = {};
    for (const [title, year, director] of films) {
      const conflict = title === "ليالي الحب" || title === "البنات والصيف";
      const id = insertRow("movies", {
        title,
        year,
        dateCertainty: conflict ? "uncertain" : "likely",
        director,
        cast: "بيانات تحتاج إلى إدخال",
        plot: "بيانات تحتاج إلى إدخال",
        dateNote:
          title === "ليالي الحب"
            ? "ويكيبيديا العربية تذكر 1955 والإنجليزية تذكر 1956 — يحتاج إلى تحقق"
            : title === "البنات والصيف"
              ? "الفيلم من ثلاث قصص؛ ويكيبيديا الإنجليزية تذكر ثلاثة مخرجين (صلاح أبو سيف، عز الدين ذو الفقار، فطين عبد الوهاب)"
              : "",
      }).id;
      M[title] = id;
      cite("movies", id, "year", AR, conflict ? "uncertain" : "likely", "قائمة الأفلام");
      cite("movies", id, "year", EN, conflict ? "uncertain" : "likely", "Filmography");
    }

    // ---------------- الأغاني ----------------
    type S = {
      title: string;
      category: string;
      composer?: number;
      lyricist?: number;
      year?: number;
      movie?: number;
      notes?: string;
      src: number[];
      certainty?: string;
    };
    const songs: S[] = [
      { title: "قارئة الفنجان", category: "qasida", composer: P.mougy, lyricist: P.nizar, year: 1976, src: [AR], notes: "تذكر ويكيبيديا العربية أنها قُدمت في حفلة شم النسيم عام 1976." },
      { title: "سواح", category: "romantic", composer: P.baligh, lyricist: P.hamza, src: [AR, EN] },
      { title: "موعود", category: "romantic", composer: P.baligh, lyricist: P.hamza, src: [AR, EN] },
      { title: "جانا الهوى", category: "film", composer: P.baligh, lyricist: P.hamza, year: 1969, movie: M["أبي فوق الشجرة"], src: [AR], notes: "قدمها في فيلم أبي فوق الشجرة (1969) حسب ويكيبيديا العربية." },
      { title: "صافيني مرة", category: "romantic", composer: P.mougy, lyricist: P.mahgoub, year: 1952, src: [AR] },
      { title: "على قد الشوق", category: "romantic", composer: P.taweel, lyricist: P.mali, year: 1954, src: [AR] },
      { title: "توبة", category: "romantic", composer: P.wahab, lyricist: P.hussein, year: 1955, src: [AR] },
      { title: "أهواك", category: "romantic", composer: P.wahab, src: [AR, EN], notes: "اسم الشاعر: بيانات تحتاج إلى إدخال." },
      { title: "إحنا الشعب", category: "national", composer: P.taweel, lyricist: P.jahin, year: 1956, src: [EN], notes: "يذكر المصدر أنها أول تعاون بين عبد الحليم وكمال الطويل وصلاح جاهين." },
      { title: "لقاء", category: "qasida", composer: P.taweel, lyricist: P.sabour, src: [AR], notes: "يصفها المصدر بأنها أول أغنية خاصة يسجلها عبد الحليم للإذاعة. التاريخ غير مؤكد." },
      { title: "من غير ليه", category: "romantic", composer: P.wahab, lyricist: P.morsi, src: [AR], notes: "يذكر المصدر أن الإذاعة نشرت بروفة لها بعد وفاة عبد الحليم." },
    ];
    const SID: Record<string, number> = {};
    for (const s of songs) {
      const id = insertRow("songs", {
        title: s.title,
        category: s.category,
        composer: s.composer ?? null,
        lyricist: s.lyricist ?? null,
        movie: s.movie ?? null,
        year: s.year ?? null,
        dateCertainty: s.year ? "likely" : "unknown",
        notes: s.notes ?? "",
      }).id;
      SID[s.title] = id;
      for (const src of s.src) cite("songs", id, "general", src, "likely", "", "مصدر ثانوي — يُفضل التحقق من مصدر أولي");
    }

    // ---------------- حفلة واحدة موثقة جزئيًا ----------------
    const concert = insertRow("concerts", {
      title: "حفلة شم النسيم 1976",
      occasion: "شم النسيم",
      year: 1976,
      dateCertainty: "likely",
      dateNote: "اليوم والشهر: بيانات تحتاج إلى إدخال",
      venue: "بيانات تحتاج إلى إدخال",
      city: "",
      country: "مصر",
      history: "تذكر ويكيبيديا العربية أن «قارئة الفنجان» قُدمت في هذه الحفلة. باقي التفاصيل تحتاج إلى إدخال وتوثيق.",
    }).id;
    cite("concerts", concert, "general", AR, "likely");

    // ---------------- التسجيلات (بدون ملفات صوتية) ----------------
    const rec = (song: string, data: any) => insertRow("recordings", { song: SID[song], ...data });
    rec("قارئة الفنجان", { title: "تسجيل حفلة شم النسيم", recordingType: "live", concert, year: 1976, dateCertainty: "likely", orderInEvent: 1, country: "مصر", notes: "ملف الصوت لم يُضف بعد." });
    rec("جانا الهوى", { title: "نسخة الفيلم", recordingType: "film", movie: M["أبي فوق الشجرة"], year: 1969, dateCertainty: "likely" });
    rec("من غير ليه", { title: "بروفة (نشرتها الإذاعة لاحقًا)", recordingType: "rehearsal", isRare: 1, rareCategory: "rehearsal", dateCertainty: "unknown", notes: "تاريخ البروفة غير مؤكد. لا تضف تاريخًا دون مصدر." });
    rec("لقاء", { title: "التسجيل الإذاعي", recordingType: "radio", isRare: 1, rareCategory: "radio", dateCertainty: "unknown" });
    for (const t of ["سواح", "موعود", "صافيني مرة", "على قد الشوق", "توبة", "أهواك", "إحنا الشعب"]) {
      rec(t, { title: "", recordingType: null, dateCertainty: "unknown", notes: "بيانات التسجيل تحتاج إلى إدخال" });
    }

    // ---------------- الخط الزمني ----------------
    const ev = (data: any) => insertRow("events", { milestone: 1, ...data });
    const birth = ev({ title: "الميلاد", eventType: "life", year: 1929, date: "1929-06-21", dateCertainty: "confirmed", description: "وُلد عبد الحليم علي إسماعيل شبانة في قرية الحلوات بمركز الإبراهيمية، محافظة الشرقية." }).id;
    cite("events", birth, "date", AR, "confirmed");
    cite("events", birth, "date", EN, "confirmed");
    const e52 = ev({ title: "صافيني مرة", eventType: "song", year: 1952, dateCertainty: "likely", song: SID["صافيني مرة"], description: "من أغانيه المبكرة، من ألحان محمد الموجي وكلمات سمير محجوب." }).id;
    cite("events", e52, "year", AR, "likely");
    const e55 = ev({ title: "أول أفلامه: لحن الوفاء", eventType: "film", year: 1955, dateCertainty: "likely", movie: M["لحن الوفاء"], description: "بداية مشواره السينمائي، إخراج إبراهيم عمارة." }).id;
    cite("events", e55, "year", AR, "likely");
    const e56 = ev({ title: "إحنا الشعب", eventType: "song", year: 1956, dateCertainty: "likely", song: SID["إحنا الشعب"], description: "أول تعاون بين عبد الحليم وكمال الطويل وصلاح جاهين حسب المصدر." }).id;
    cite("events", e56, "year", EN, "likely");
    const e69 = ev({ title: "آخر أفلامه: أبي فوق الشجرة", eventType: "film", year: 1969, dateCertainty: "likely", movie: M["أبي فوق الشجرة"], description: "إخراج حسين كمال." }).id;
    cite("events", e69, "year", AR, "likely");
    const e76 = ev({ title: "قارئة الفنجان", eventType: "concert", year: 1976, dateCertainty: "likely", song: SID["قارئة الفنجان"], concert, description: "قصيدة نزار قباني من ألحان محمد الموجي، قُدمت في حفلة شم النسيم." }).id;
    cite("events", e76, "year", AR, "likely");
    const death = ev({ title: "الوفاة", eventType: "life", year: 1977, date: "1977-03-30", dateCertainty: "confirmed", description: "توفي في لندن." }).id;
    cite("events", death, "date", AR, "confirmed");
    cite("events", death, "date", EN, "confirmed");

    setSetting(
      "bio",
      "عبد الحليم علي إسماعيل شبانة، المعروف بعبد الحليم حافظ. وُلد في 21 يونيو 1929 بقرية الحلوات في محافظة الشرقية، وتوفي في لندن في 30 مارس 1977. غنّى الأغنية العاطفية والوطنية والقصيدة، وشارك في أفلام سينمائية من 1955 إلى 1969.",
    );
    setSetting("heroImage", "");
    setSetting("siteTitle", "أرشيف عبد الحليم حافظ");
  });
  tx();
  reindexAll();
  setMeta("seeded", new Date().toISOString());
  console.log("[seed] initial data inserted");
}
