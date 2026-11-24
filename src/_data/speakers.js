import loadMeetings from "./meetings.js";
import { speakerId } from "../../scripts/lib/meeting.js";

const collator = new Intl.Collator("pl-PL");
const TOP_SIZE = 3;

/**
 * Prelegenci zebrani ze wszystkich spotkań (data/meetings).
 *
 * - `top`    – TOP 3: najwięcej wystąpień; przy remisie wyżej ten, kto wystąpił najdawniej.
 * - `groups` – pozostali, w grupach „N wystąpień” (malejąco); w grupie od najnowszego
 *              wystąpienia do najstarszego.
 *
 * Prelegent jest rozpoznawany po imieniu i nazwisku; zdjęcie i bio pochodzą
 * z jego najnowszego wystąpienia.
 */
export default async function () {
  const meetings = await loadMeetings(); // od najnowszego
  const byId = new Map();

  for (const meeting of meetings) {
    meeting.talks.forEach((talk, talkIndex) => {
      for (const speaker of talk.speakers) {
        const id = speakerId(speaker.name);
        if (!byId.has(id)) {
          byId.set(id, { id, name: speaker.name, bio: speaker.bio, photo: speaker.photo, talks: [] });
        }
        byId.get(id).talks.push({
          title: talk.title,
          recordingUrl: talk.recordingUrl,
          coSpeakers: talk.speakers.filter((other) => other.name !== speaker.name).map((other) => other.name),
          // Pozycja wystąpienia w czasie: numer spotkania + kolejność prelekcji na spotkaniu.
          order: meeting.number * 100 + talkIndex,
          meeting: {
            number: meeting.number,
            title: meeting.title,
            url: meeting.url,
            day: meeting.day,
            dateLabel: meeting.dateLabel,
          },
        });
      }
    });
  }

  const speakers = [...byId.values()];
  for (const speaker of speakers) {
    speaker.talkCount = speaker.talks.length;
    speaker.recordings = speaker.talks.filter((talk) => talk.recordingUrl).length;
    speaker.first = speaker.talks.at(-1); // talks są od najnowszego
    speaker.latest = speaker.talks[0];
  }

  const surname = (name) => name.split(/\s+/).at(-1);
  const byName = (a, b) => collator.compare(surname(a.name), surname(b.name)) || collator.compare(a.name, b.name);

  const top = [...speakers]
    .sort((a, b) => b.talkCount - a.talkCount || a.first.order - b.first.order || byName(a, b))
    .slice(0, TOP_SIZE);
  top.forEach((speaker, index) => (speaker.rank = index + 1));

  const rest = speakers
    .filter((speaker) => !top.includes(speaker))
    .sort((a, b) => b.talkCount - a.talkCount || b.latest.order - a.latest.order || byName(a, b));

  // Grupy „N wystąpień” w kolejności malejącej – do nagłówków na stronie.
  const groups = [];
  for (const speaker of rest) {
    let group = groups.at(-1);
    if (!group || group.talkCount !== speaker.talkCount) {
      group = { talkCount: speaker.talkCount, speakers: [] };
      groups.push(group);
    }
    group.speakers.push(speaker);
  }

  return {
    all: [...top, ...rest],
    top,
    groups,
    talkTotal: speakers.reduce((sum, s) => sum + s.talkCount, 0),
  };
}
