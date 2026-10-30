// RT-05 red-team 30 Okt: parser [FOLLOWUPS] tangguh — dukung multiline bullet,
// **bold**, variasi tag ([FOLLOWUP]/[FOLLOW UPS]), separator "|" "/" ";" dan "atau".
export function splitFollowUps(raw: string): { text: string; followUps: string[] } {
  const m = raw.match(/\n?\*{0,2}\[FOLLOW\s?UPS?\]\*{0,2}[\s:]*([\s\S]+)$/i);
  if (!m) return { text: raw.trim(), followUps: [] };
  const cleaned = m[1]
    .replace(/^[\s-•]+/gm, "") // bullet multiline
    .replace(/\*+/g, "") // bold sisa
    .split(/\n|\||\/|;|\batau\b/i)
    .map((x) => x.replace(/^\(.+?\)\s*/, "").replace(/^[\s-•]+/, "").trim())
    .filter((x) => x.length > 3 && x.length <= 60)
    .slice(0, 3);
  return { text: raw.replace(m[0], "").trim(), followUps: cleaned };
}
