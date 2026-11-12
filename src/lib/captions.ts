import metaRules from '../knowledge/metaRules.json';
export type Tone = 'Warm & relatable' | 'Playful & punchy' | 'Thoughtful & calm';
export interface CaptionResult {
  captions: string[];
  keywords: string[];
  hashtags: string[];
}
// Local templates only. No model calls, content inspection, link fetching, or trend claims.
export function createCaptions(topic: string, tone: Tone): CaptionResult {
  const subject = topic.trim().replace(/\s+/g, ' ').slice(0, 140) || 'the little moments';
  const short = subject.length > 65 ? `${subject.slice(0, 62)}…` : subject;
  const openers: Record<Tone, string[]> = {
    'Warm & relatable': [
      `A little reminder to make room for ${subject.toLowerCase()}. ☀️`,
      `Lately, it’s been all about ${subject.toLowerCase()}.`,
      `The kind of ${subject.toLowerCase()} I want to remember.`,
    ],
    'Playful & punchy': [
      `Current obsession: ${subject.toLowerCase()}. ✨`,
      `${short}. That’s the post. That’s the vibe.`,
      `Consider this your sign to try ${subject.toLowerCase()}.`,
    ],
    'Thoughtful & calm': [
      `Finding a little more meaning in ${subject.toLowerCase()}.`,
      `A quiet moment for ${subject.toLowerCase()}.`,
      `There’s something worth noticing in ${subject.toLowerCase()}.`,
    ],
  };
  const captions = openers[tone].map(
    (o, i) =>
      `${o}\n\n${['Not everything needs to be a big moment to be a good one. Sometimes the smallest shift makes the whole day feel different.', 'Less chasing the perfect version. More showing up for the real one. This is a little piece of what that looks like for me.', 'Making things just because they feel like me. No perfect plan, just a little curiosity and a reason to start.'][i]}\n\n${['What’s one little thing you’re making space for this week?', 'Save this for a day when you need a little inspiration. 🌿', 'What would your version look like? Tell me below.'][i]}`,
  );
  const words = subject
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !['with', 'that', 'this', 'about', 'from'].includes(w));
  const keywords = [
    ...new Set([...words, 'intentional living', 'everyday creativity', 'creator life']),
  ].slice(0, 6);
  const topical = words.join('').slice(0, 35) || 'littlemoments';
  const hashtags = [
    ...new Set([
      `#${topical}`,
      '#everydaycreativity',
      '#creatormindset',
      '#littlemomentsofjoy',
      '#createwithintention',
    ]),
  ].slice(0, metaRules.maxHashtags);
  return { captions, keywords, hashtags };
}
export function isDraftLink(value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname.includes('.'));
  } catch {
    return false;
  }
}
