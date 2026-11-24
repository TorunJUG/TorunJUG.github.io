// Wspólne funkcje skryptów pobierających historię spotkań z crossweb.pl.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BASE_URL = "https://crossweb.pl";
export const LIST_URL = `${BASE_URL}/cykle-wydarzen/torun-jug/wydarzenia/`;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const OUTPUT_DIR = path.join(projectRoot, "data", "crossweb");
export const CACHE_DIR = path.join(OUTPUT_DIR, "cache");
export const LIST_FILE = path.join(OUTPUT_DIR, "events-list.json");
export const DETAILS_FILE = path.join(OUTPUT_DIR, "events.json");

const USER_AGENT = "Mozilla/5.0 (compatible; TorunJUG-archive-script; +https://torun.jug.pl/)";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pobiera stronę jako tekst; ponawia przy błędach sieci i odpowiedziach 429/5xx. */
export async function fetchText(url, { retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "pl,en;q=0.8" },
      });
      if (response.ok) return await response.text();
      if (attempt > retries || ![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`HTTP ${response.status} dla ${url}`);
      }
    } catch (error) {
      if (attempt > retries) throw error;
    }
    await sleep(5000 * attempt);
  }
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»",
  bdquo: "„", rdquo: "”", ldquo: "“", rsquo: "’", lsquo: "‘", bull: "•",
};

export const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

/** Usuwa znaczniki i normalizuje białe znaki w jednej linii. */
export const stripTags = (html) => decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/**
 * Zamienia HTML opisu (edytor Quill: <p>, <br>, <strong>, <a>, listy) na tekst
 * z zachowanymi akapitami. Pusty akapit (<p><br></p>) daje pustą linię.
 */
export function htmlToText(html) {
  const text = html
    .replace(/\r?\n/g, " ")
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Numer spotkania z tytułu: „60. spotkanie Toruń JUG …”, „53. Toruń JUG”, „Toruń JUG #81 …”. */
export function meetingNumber(title) {
  const match = title.match(/^\s*(\d+)\.\s*(?:spotkanie\s+)?Toru[nń]\s*JUG\b/i) || title.match(/^\s*Toru[nń]\s*JUG\s*#(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

export const slugFromUrl = (url) => new URL(url, BASE_URL).pathname.split("/").filter(Boolean).at(-1);
