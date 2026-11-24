// Walidacja i normalizacja danych spotkania (data/meetings/*.json).
// Używane przez src/_data/meetings.js. Błąd w danych przerywa build,
// więc niepoprawny JSON nigdy nie trafi na produkcję.

const SITE_URL = "https://torun.jug.pl";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHOTO_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:avif|gif|jpe?g|png|webp)$/i;

export const EVENT_STATUSES = {
  scheduled: "https://schema.org/EventScheduled",
  completed: "https://schema.org/EventCompleted",
  cancelled: "https://schema.org/EventCancelled",
  postponed: "https://schema.org/EventPostponed",
};

const TEMPLATES = ["v1", "v2"];

const requiredString = (value, field) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`pole „${field}” musi być niepustym tekstem`);
  }
  return value.trim();
};

const requiredUrl = (value, field) => {
  const text = requiredString(value, field);
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`pole „${field}” musi być poprawnym adresem URL`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`pole „${field}” musi używać protokołu http lub https`);
  }
  return text;
};

const parseDate = (value, field) => {
  const text = requiredString(value, field);
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(text)) {
    throw new Error(`pole „${field}” musi zawierać strefę czasową, np. 2026-09-23T18:00:00+02:00`);
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`pole „${field}” nie jest poprawną datą ISO 8601`);
  }
  return { date, text };
};

const formatter = (options) =>
  new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", ...options });
const dateFormatter = formatter({ day: "numeric", month: "long", year: "numeric" });
const timeFormatter = formatter({ hour: "2-digit", minute: "2-digit", hour12: false });
const isoDayFormatter = formatter({ year: "numeric", month: "2-digit", day: "2-digit" });

export const formatDate = (date) => dateFormatter.format(date);
export const formatTime = (date) => timeFormatter.format(date);
/** Dzień w strefie Europe/Warsaw w formacie RRRR-MM-DD. */
export const isoDay = (date) => {
  const parts = Object.fromEntries(isoDayFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/** Identyfikator prelegenta do adresów i kotwic, np. „Michał Szynkiewicz” → „michal-szynkiewicz”. */
export const speakerId = (name) =>
  name
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const youtubeVideoId = (value, field) => {
  const source = requiredUrl(value, field);
  const url = new URL(source);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId;

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0];
  } else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(hostname)) {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    if (/^\/(?:embed|shorts)\//.test(url.pathname)) videoId = url.pathname.split("/")[2];
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId || "")) {
    throw new Error(`pole „${field}” musi wskazywać film w serwisie YouTube`);
  }
  return videoId;
};

const optionalString = (value, field) => (value === undefined || value === null ? null : requiredString(value, field));

/** Inicjały do zastępczego awatara, gdy prelegent nie ma zdjęcia: „Jan Kowalski” → „JK”. */
const initials = (name) =>
  name
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part))
    .map((part) => part[0].toUpperCase())
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .join("");

const normalizeSpeaker = (speaker, prefix) => {
  // Zdjęcie i bio są opcjonalne – historyczne spotkania często ich nie mają.
  // Bez zdjęcia szablony pokazują kafelek z inicjałami.
  const photo = optionalString(speaker?.photo, `${prefix}.photo`);
  if (photo && !PHOTO_PATTERN.test(photo)) {
    throw new Error(`pole „${prefix}.photo” musi być nazwą pliku graficznego umieszczonego w src/static/speakers`);
  }
  const name = requiredString(speaker?.name, `${prefix}.name`);
  return {
    id: speakerId(name),
    name,
    initials: initials(name),
    bio: optionalString(speaker?.bio, `${prefix}.bio`),
    photo,
  };
};

const normalizeTalk = (talk, index) => {
  const prefix = `talks[${index}]`;
  const rawSpeakers = Array.isArray(talk?.speakers) ? talk.speakers : talk?.speaker ? [talk.speaker] : [];
  if (rawSpeakers.length === 0) {
    throw new Error(`prelekcja „${prefix}” musi zawierać „speaker” lub niepustą tablicę „speakers”`);
  }

  let recordingUrl = null;
  let videoId = null;
  if (talk?.recordingUrl) {
    recordingUrl = requiredUrl(talk.recordingUrl, `${prefix}.recordingUrl`);
    videoId = youtubeVideoId(recordingUrl, `${prefix}.recordingUrl`);
  }

  return {
    title: requiredString(talk?.title, `${prefix}.title`),
    description: optionalString(talk?.description, `${prefix}.description`),
    speakers: rawSpeakers.map((speaker, i) => normalizeSpeaker(speaker, `${prefix}.speakers[${i}]`)),
    recordingUrl,
    videoId,
  };
};

const structuredData = (meeting) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  name: `Toruń JUG #${meeting.number} – ${meeting.title}`,
  url: meeting.canonicalUrl,
  ...(meeting.startDate ? { startDate: meeting.startDate, endDate: meeting.endDate } : {}),
  eventStatus: EVENT_STATUSES[meeting.status],
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  ...(meeting.location
    ? {
        location: {
          "@type": "Place",
          name: meeting.location.place,
          address: {
            "@type": "PostalAddress",
            ...(meeting.location.address ? { streetAddress: meeting.location.address } : {}),
            addressLocality: meeting.location.city,
            addressCountry: "PL",
          },
        },
      }
    : {}),
  organizer: { "@type": "Organization", name: "Toruń JUG", url: `${SITE_URL}/` },
  performer: meeting.talks.flatMap((talk) =>
    talk.speakers.map((speaker) => ({
      "@type": "Person",
      name: speaker.name,
      ...(speaker.bio ? { description: speaker.bio } : {}),
      ...(speaker.photo ? { image: `${SITE_URL}/static/speakers/${speaker.photo}` } : {}),
    })),
  ),
});

/**
 * Sprawdza surowe dane spotkania i zwraca obiekt gotowy dla szablonów.
 * @param {object} data – zawartość pliku JSON
 * @param {string} file – nazwa pliku (do komunikatów błędów i kontroli zgodności ze slugiem)
 */
export function normalizeMeeting(data, file) {
  try {
    const number = Number(data.number);
    if (!Number.isInteger(number) || number < 1) {
      throw new Error("pole „number” musi być dodatnią liczbą całkowitą");
    }

    const slug = requiredString(data.slug, "slug");
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error("pole „slug” może zawierać wyłącznie małe litery ASCII, cyfry i pojedyncze myślniki");
    }
    if (!slug.startsWith(`${number}-`)) {
      throw new Error(`„slug” musi zaczynać się od numeru spotkania, np. „${number}-${slug}”`);
    }
    if (file && file !== `${slug}.json`) {
      throw new Error(`nazwa pliku musi odpowiadać slugowi: ${slug}.json`);
    }

    // Daty są opcjonalne (najstarsze spotkania nie mają znanej daty), ale tylko obie naraz.
    let start = null;
    let end = null;
    if (data.startDate || data.endDate) {
      start = parseDate(data.startDate, "startDate");
      end = parseDate(data.endDate, "endDate");
      if (end.date <= start.date) throw new Error("„endDate” musi być późniejsze niż „startDate”");
      if (formatDate(start.date) !== formatDate(end.date)) {
        throw new Error("szablon obsługuje spotkania rozpoczynające się i kończące tego samego dnia");
      }
    }

    const status = data.status ?? "scheduled";
    if (!EVENT_STATUSES[status]) throw new Error(`nieznany „status”: ${status}`);

    const template = data.template ?? "v1";
    if (!TEMPLATES.includes(template)) {
      throw new Error(`nieznany „template”: ${template}; wybierz ${TEMPLATES.join(" albo ")}`);
    }

    if (!Array.isArray(data.talks) || data.talks.length === 0) {
      throw new Error("pole „talks” musi zawierać co najmniej jedną prelekcję");
    }

    const title = requiredString(data.title, "title");
    const meeting = {
      number,
      slug,
      title,
      cardTitle: data.cardTitle ? requiredString(data.cardTitle, "cardTitle") : title,
      description: requiredString(data.description, "description"),
      startDate: start?.text ?? null,
      endDate: end?.text ?? null,
      status,
      template,
      location: data.location
        ? {
            place: requiredString(data.location.place, "location.place"),
            address: optionalString(data.location.address, "location.address"),
            city: requiredString(data.location.city, "location.city"),
          }
        : null,
      meetup: data.meetup
        ? {
            url: requiredUrl(data.meetup.url, "meetup.url"),
            label: requiredString(data.meetup.label, "meetup.label"),
          }
        : null,
      talks: data.talks.map(normalizeTalk),
      url: `${slug}.html`,
      canonicalUrl: `${SITE_URL}/spotkania/${slug}.html`,
      pageTitle: data.pageTitle || `Toruń JUG #${number} – ${title}`,
      ogDescription: data.ogDescription || `Tematy, prelegenci i informacje o ${number}. spotkaniu Toruń JUG.`,
      ogImage: data.ogImage ? requiredUrl(data.ogImage, "ogImage") : `${SITE_URL}/static/media/cover.jpg`,
      day: start ? isoDay(start.date) : null,
      dateLabel: start ? formatDate(start.date) : null,
      timeLabel: start ? `${formatTime(start.date)}–${formatTime(end.date)}` : null,
      year: start ? Number(isoDay(start.date).slice(0, 4)) : null,
    };

    meeting.recordings = meeting.talks.filter((talk) => talk.recordingUrl).length;
    // Prelegenci jednej prelekcji łączeni „i”, kolejne prelekcje kropką.
    meeting.speakersLabel = meeting.talks
      .map((talk) => talk.speakers.map((speaker) => speaker.name).join(" i "))
      .join(" · ");
    meeting.structuredData = structuredData(meeting);
    return meeting;
  } catch (error) {
    throw new Error(`${file ?? "spotkanie"}: ${error.message}`);
  }
}
