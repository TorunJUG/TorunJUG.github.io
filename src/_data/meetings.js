import { readdir, readFile } from "node:fs/promises";
import { normalizeMeeting } from "../../scripts/lib/meeting.js";

const MEETINGS_DIR = new URL("../../data/meetings/", import.meta.url);

/**
 * Wszystkie spotkania z data/meetings/<numer>-<slug>.json,
 * zwalidowane i posortowane od najnowszego.
 */
export default async function () {
  const files = (await readdir(MEETINGS_DIR)).filter((file) => /^\d+-.+\.json$/.test(file));

  const meetings = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(new URL(file, MEETINGS_DIR), "utf8");
      let data;
      try {
        data = JSON.parse(source);
      } catch (error) {
        throw new Error(`${file}: niepoprawny JSON – ${error.message}`);
      }
      return normalizeMeeting(data, file);
    }),
  );

  meetings.sort((a, b) => b.number - a.number);

  const seen = new Map();
  for (const meeting of meetings) {
    if (seen.has(meeting.number)) {
      throw new Error(`numer spotkania #${meeting.number} występuje w dwóch plikach: ${seen.get(meeting.number)} i ${meeting.slug}.json`);
    }
    seen.set(meeting.number, `${meeting.slug}.json`);
  }

  // Nawigacja nowsze/starsze wyliczana automatycznie – nie trzeba jej wpisywać w JSON.
  meetings.forEach((meeting, index) => {
    const link = (other) => (other ? { number: other.number, slug: other.slug, url: other.url } : null);
    meeting.newer = link(meetings[index - 1]);
    meeting.older = link(meetings[index + 1]);
  });

  return meetings;
}
