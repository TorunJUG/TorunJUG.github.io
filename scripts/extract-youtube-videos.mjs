import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const usage =
  "Użycie: node scripts/extract-youtube-videos.mjs <strona.html> [--output <filmy.json>]";

const fail = (message) => {
  console.error(`Błąd: ${message}`);
  console.error(usage);
  process.exitCode = 1;
};

const decodeHtml = (value) => {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, name) => {
    if (name[0] !== "#") return namedEntities[name.toLowerCase()] ?? entity;

    const hexadecimal = name[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(name.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);

    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return entity;
    }
  });
};

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const attributesFrom = (tag) => {
  const attributes = new Map();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  for (const match of tag.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? ""));
  }

  return attributes;
};

const videoIdFrom = (source) => {
  let url;

  try {
    url = new URL(source, "https://www.youtube.com");
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId = null;

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0];
  } else if (["youtube.com", "m.youtube.com"].includes(hostname)) {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    if (/^\/(?:embed|shorts)\//.test(url.pathname)) videoId = url.pathname.split("/")[2];
  }

  return /^[a-zA-Z0-9_-]{11}$/.test(videoId ?? "") ? videoId : null;
};

const quotedPart = (value) => {
  const quotePairs = [
    ['"', '"'],
    ["„", "”"],
    ["“", "”"],
    ["«", "»"],
  ];

  for (const [opening, closing] of quotePairs) {
    const start = value.indexOf(opening);
    const end = value.lastIndexOf(closing);
    if (start !== -1 && end > start) {
      return {
        title: value.slice(start + opening.length, end).trim(),
        remainder: value.slice(end + closing.length).trim(),
      };
    }
  }

  return null;
};

const trimSeparator = (value) =>
  value
    .replace(/^(?:\s*[-–—:|]\s*)+/, "")
    .replace(/(?:\s*\|\s*)+$/, "")
    .trim();

const withoutMeetingLabel = (value, meetingNumber) => {
  if (meetingNumber === null) return value;

  const label = `Tor(?:uń|un)\\s+JUG\\s*#\\s*${meetingNumber}`;
  return value
    .replace(new RegExp(`^\\s*${label}\\s*`, "iu"), "")
    .replace(new RegExp(`\\s*\\|\\s*${label}\\s*$`, "iu"), "")
    .trim();
};

const metadataFromTitle = (fullTitle) => {
  const meetingMatch = fullTitle.match(/#\s*(\d+)/u);
  if (!meetingMatch) {
    return { meetingNumber: null, title: fullTitle, speaker: null };
  }

  const meetingNumber = Number.parseInt(meetingMatch[1], 10);
  let remainder = trimSeparator(withoutMeetingLabel(fullTitle, meetingNumber));

  // Nowsze filmy mają przed właściwym tytułem opis SEO, np.
  // „Czy AI nas zastąpi? | \"Historia...\" - Autor | Toruń JUG #89”.
  const pipeBeforeQuote = remainder.search(/\|\s*["„“«]/u);
  if (pipeBeforeQuote !== -1) remainder = remainder.slice(pipeBeforeQuote + 1).trim();

  const quoted = quotedPart(remainder);

  if (quoted) {
    return {
      meetingNumber,
      title: quoted.title,
      speaker: trimSeparator(quoted.remainder) || null,
    };
  }

  // YouTube potrafi skrócić tytuł przed domykającym cudzysłowem. Wtedy
  // ostatnia część po myślniku nadal zawiera prowadzącego.
  if (/^["„“«]/u.test(remainder)) {
    const unclosed = remainder.slice(1).split(/\s+[-–—]\s+/u);
    if (unclosed.length >= 2) {
      return {
        meetingNumber,
        title: unclosed.slice(0, -1).join(" - ").trim(),
        speaker: trimSeparator(unclosed.at(-1)) || null,
      };
    }
  }

  const parts = remainder
    .split(/\s+[-–—]\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      meetingNumber,
      title: parts.slice(0, -1).join(" - "),
      speaker: parts.at(-1),
    };
  }

  return { meetingNumber, title: remainder || fullTitle, speaker: null };
};

const extractVideos = (html) => {
  const videos = [];
  const seenVideoIds = new Set();
  const anchorPattern = /<a\b[^>]*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const attributes = attributesFrom(match[0]);
    const fullTitle = normalizeWhitespace(attributes.get("title") ?? "");
    const videoId = videoIdFrom(attributes.get("href") ?? "");

    if (!fullTitle || !videoId || seenVideoIds.has(videoId)) continue;

    const metadata = metadataFromTitle(fullTitle);
    seenVideoIds.add(videoId);
    videos.push({
      numerSpotkania: metadata.meetingNumber,
      tytul: metadata.title,
      prowadzacy: metadata.speaker,
      link: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return videos;
};

const main = async () => {
  const args = process.argv.slice(2);
  const outputFlag = args.indexOf("--output");
  let outputPath = null;

  if (outputFlag !== -1) {
    outputPath = args[outputFlag + 1];
    if (!outputPath) throw new Error("po --output podaj ścieżkę pliku JSON");
    args.splice(outputFlag, 2);
  }

  if (args.length !== 1) throw new Error(usage);

  const inputPath = path.resolve(process.cwd(), args[0]);
  const html = await readFile(inputPath, "utf8");
  const videos = extractVideos(html);

  if (videos.length === 0) {
    throw new Error("nie znaleziono żadnych filmów; upewnij się, że strona została przewinięta do końca przed zapisaniem");
  }

  const json = `${JSON.stringify(videos, null, 2)}\n`;
  const incomplete = videos.filter(
    ({ numerSpotkania, tytul, prowadzacy }) => numerSpotkania === null || !tytul || !prowadzacy,
  );

  if (outputPath) {
    const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
    await writeFile(resolvedOutputPath, json, "utf8");
    console.error(`Zapisano ${videos.length} filmów do ${resolvedOutputPath}`);
  } else {
    process.stdout.write(json);
  }

  if (incomplete.length > 0) {
    console.error(
      `Uwaga: ${incomplete.length} rekordów nie ma numeru spotkania lub prowadzącego; pozostawiono w nich wartość null.`,
    );
  }
};

main().catch((error) => fail(error.message));
