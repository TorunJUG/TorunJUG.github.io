import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePaths = new Map([
  ["v1", path.join(projectRoot, "templates", "spotkanie.html")],
  ["v2", path.join(projectRoot, "templates", "spotkanie-v2.html")],
]);
const meetingsDirectory = path.join(projectRoot, "spotkania");

const fail = (message) => {
  console.error(`Błąd: ${message}`);
  process.exitCode = 1;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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

const formatDate = (date) =>
  new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

const formatTime = (date) =>
  new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

const speakerPhotoSource = (filename, field) => {
  const value = requiredString(filename, field);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:avif|gif|jpe?g|png|webp)$/i.test(value)) {
    throw new Error(`pole „${field}” musi być nazwą pliku graficznego umieszczonego w static/media`);
  }

  return `../static/media/${value}`;
};

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

const talkSpeakers = (talk, index) => {
  const speakers = Array.isArray(talk?.speakers) ? talk.speakers : talk?.speaker ? [talk.speaker] : [];
  if (speakers.length === 0) {
    throw new Error(`prelekcja „talks[${index}]” musi zawierać „speaker” lub niepustą tablicę „speakers”`);
  }

  return speakers;
};

const renderTalks = (talks, templateVersion) => {
  if (!Array.isArray(talks) || talks.length === 0) {
    throw new Error("pole „talks” musi zawierać co najmniej jedną prelekcję");
  }

  return talks
    .map((talk, index) => {
      const title = escapeHtml(requiredString(talk?.title, `talks[${index}].title`));
      const description = escapeHtml(requiredString(talk?.description, `talks[${index}].description`));
      const speakers = talkSpeakers(talk, index);
      const speakerProfiles = speakers
        .map((speaker, speakerIndex) => {
          const prefix = `talks[${index}].speakers[${speakerIndex}]`;
          const speakerName = escapeHtml(requiredString(speaker?.name, `${prefix}.name`));
          const speakerBio = escapeHtml(requiredString(speaker?.bio, `${prefix}.bio`));
          const photoSource = escapeHtml(speakerPhotoSource(speaker?.photo, `${prefix}.photo`));

          return `                  <section class="talk-speaker-profile" aria-label="Informacje o prelegencie">
                    <img class="talk-speaker-photo" src="${photoSource}" width="300" height="300" alt="Zdjęcie: ${speakerName}" loading="lazy" decoding="async">
                    <div class="talk-speaker-details">
                      <p class="talk-speaker-label">Prelegent</p>
                      <h4>${speakerName}</h4>
                      <p class="talk-speaker-bio">${speakerBio}</p>
                    </div>
                  </section>`;
        })
        .join("\n");
      let recording = '<span class="talk-unavailable">Nagranie jeszcze niedostępne</span>';

      if (talk?.recordingUrl) {
        const recordingField = `talks[${index}].recordingUrl`;
        const recordingUrl = requiredUrl(talk.recordingUrl, recordingField);
        const videoId = youtubeVideoId(recordingUrl, recordingField);

        recording =
          templateVersion === "v2"
            ? `<div class="talk-recording">
                  <div class="talk-video talk-video-desktop">
                    <iframe src="https://www.youtube.com/embed/${videoId}" title="Nagranie prelekcji: ${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                  </div>
                  <a class="button button-primary talk-video-mobile-action" href="${escapeHtml(recordingUrl)}" target="_blank" rel="noopener noreferrer">Obejrzyj nagranie na YouTube <span aria-hidden="true">↗</span></a>
                </div>`
            : `<div class="talk-video">
                  <iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="Nagranie prelekcji: ${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>`;
      }

      return `              <article class="talk-card">
                <h3>${title}</h3>
                <p class="talk-description">${description}</p>
                <div class="talk-speakers">
${speakerProfiles}
                </div>
                ${recording}
              </article>`;
    })
    .join("\n");
};

const renderNavigation = (navigation) => {
  const links = [];

  for (const [key, label, arrow] of [
    ["newer", "Nowsze spotkanie", "left"],
    ["older", "Starsze spotkanie", "right"],
  ]) {
    const meeting = navigation?.[key];
    if (!meeting) continue;

    const number = Number(meeting.number);
    const slug = requiredString(meeting.slug, `navigation.${key}.slug`);
    if (!Number.isInteger(number) || number < 1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`niepoprawne dane w „navigation.${key}”`);
    }

    const caption = `Toruń JUG #${number}`;
    links.push(
      arrow === "left"
        ? `<a href="${slug}.html"><small>${label}</small>← ${caption}</a>`
        : `<a href="${slug}.html"><small>${label}</small>${caption} →</a>`,
    );
  }

  if (links.length === 0) return "";
  return `            <nav class="meeting-navigation" aria-label="Nawigacja między spotkaniami">${links.join("")}</nav>`;
};

const eventStatuses = {
  scheduled: "https://schema.org/EventScheduled",
  completed: "https://schema.org/EventCompleted",
  cancelled: "https://schema.org/EventCancelled",
  postponed: "https://schema.org/EventPostponed",
};

const render = (template, data, templateVersion) => {
  const number = Number(data.number);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error("pole „number” musi być dodatnią liczbą całkowitą");
  }

  const slug = requiredString(data.slug, "slug");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("pole „slug” może zawierać wyłącznie małe litery ASCII, cyfry i pojedyncze myślniki");
  }

  const title = requiredString(data.title, "title");
  const description = requiredString(data.description, "description");
  const start = parseDate(data.startDate, "startDate");
  const end = parseDate(data.endDate, "endDate");
  if (end.date <= start.date) throw new Error("„endDate” musi być późniejsze niż „startDate”");
  if (formatDate(start.date) !== formatDate(end.date)) {
    throw new Error("szablon obsługuje spotkania rozpoczynające się i kończące tego samego dnia");
  }

  const place = requiredString(data.location?.place, "location.place");
  const address = requiredString(data.location?.address, "location.address");
  const city = requiredString(data.location?.city, "location.city");
  const meetupUrl = requiredUrl(data.meetup?.url, "meetup.url");
  const meetupLabel = requiredString(data.meetup?.label, "meetup.label");
  const status = data.status ?? "scheduled";
  if (!eventStatuses[status]) {
    throw new Error(`nieznany „status”: ${status}`);
  }

  const canonicalUrl = `https://torun.jug.pl/spotkania/${slug}.html`;
  const pageTitle = data.pageTitle || `Toruń JUG #${number} – ${title}`;
  const ogDescription = data.ogDescription || `Tematy, prelegenci i informacje o ${number}. spotkaniu Toruń JUG.`;
  const ogImage = data.ogImage
    ? requiredUrl(data.ogImage, "ogImage")
    : "https://torun.jug.pl/static/media/cover.jpg";
  const dateLabel = formatDate(start.date);
  const talks = renderTalks(data.talks, templateVersion);
  const performers = data.talks.flatMap((talk, index) =>
    talkSpeakers(talk, index).map((speaker, speakerIndex) => {
      const prefix = `talks[${index}].speakers[${speakerIndex}]`;
      const speakerName = requiredString(speaker?.name, `${prefix}.name`);
      const speakerBio = requiredString(speaker?.bio, `${prefix}.bio`);
      const speakerPhoto = requiredString(speaker?.photo, `${prefix}.photo`);
      speakerPhotoSource(speakerPhoto, `${prefix}.photo`);

      return {
        "@type": "Person",
        name: speakerName,
        description: speakerBio,
        image: `https://torun.jug.pl/static/media/${speakerPhoto}`,
      };
    }),
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `Toruń JUG #${number} – ${title}`,
    url: canonicalUrl,
    startDate: start.text,
    endDate: end.text,
    eventStatus: eventStatuses[status],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: place,
      address: {
        "@type": "PostalAddress",
        streetAddress: address,
        addressLocality: city,
        addressCountry: "PL",
      },
    },
    organizer: { "@type": "Organization", name: "Toruń JUG", url: "https://torun.jug.pl/" },
    performer: performers,
  };

  const replacements = {
    pageTitle,
    description,
    canonicalUrl,
    ogDescription,
    ogImage,
    structuredData: JSON.stringify(structuredData, null, 2).replaceAll("<", "\\u003c"),
    meetupUrl,
    number,
    title,
    startDate: start.text,
    dateAndTimeLabel: `${dateLabel}, ${formatTime(start.date)}–${formatTime(end.date)}`,
    placeAndCity: `${place}, ${city}`,
    talks,
    meetingNavigation: renderNavigation(data.navigation),
    meetupLabel,
    year: start.date.getFullYear(),
  };

  return template.replace(/\{\{([A-Za-z]+)\}\}/g, (placeholder, key) => {
    if (!(key in replacements)) throw new Error(`brak wartości dla ${placeholder}`);
    return ["structuredData", "talks", "meetingNavigation"].includes(key)
      ? replacements[key]
      : escapeHtml(replacements[key]);
  });
};

const main = async () => {
  const args = process.argv.slice(2);
  const outputFlag = args.indexOf("--output");
  let outputArgument;
  let templateVersion = "v1";

  if (outputFlag !== -1) {
    outputArgument = args[outputFlag + 1];
    if (!outputArgument) throw new Error("po --output podaj ścieżkę pliku");
    args.splice(outputFlag, 2);
  }

  const currentTemplateFlag = args.indexOf("--template");
  if (currentTemplateFlag !== -1) {
    const flagIndex = currentTemplateFlag;
    templateVersion = args[flagIndex + 1];
    if (!templateVersion) throw new Error("po --template podaj wersję: v1 albo v2");
    args.splice(flagIndex, 2);
  }

  const templatePath = templatePaths.get(templateVersion);
  if (!templatePath) {
    throw new Error(`nieznana wersja szablonu „${templateVersion}”; wybierz v1 albo v2`);
  }

  if (args.length !== 1) {
    throw new Error("użycie: node scripts/generate-meeting.mjs <dane.json> [--template v1|v2] [--output <plik.html>]");
  }

  const dataPath = path.resolve(process.cwd(), args[0]);
  const [template, source] = await Promise.all([
    readFile(templatePath, "utf8"),
    readFile(dataPath, "utf8"),
  ]);
  const data = JSON.parse(source);
  const html = render(template, data, templateVersion);
  const outputPath = outputArgument
    ? path.resolve(process.cwd(), outputArgument)
    : path.join(meetingsDirectory, `${data.slug}.html`);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  console.log(`Wygenerowano: ${path.relative(projectRoot, outputPath)}`);
};

main().catch((error) => fail(error.message));
