export function getMarketStatus(): { label: string; open: boolean } {
  const now = new Date();
  const jakarta = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const day = jakarta.getDay();
  const totalMinutes = jakarta.getHours() * 60 + jakarta.getMinutes();

  if (day === 0 || day === 6) return { label: "CLOSED", open: false };
  if (totalMinutes >= 540 && totalMinutes < 960) return { label: "OPEN", open: true };
  return { label: "CLOSED", open: false };
}
