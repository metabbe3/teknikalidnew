const API_URL = process.env.SYNC_API_URL?.replace("/sync-stocks", "/community-agent")
  || "http://localhost:3000/api/cron/community-agent";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("CRON_SECRET environment variable is required");
  process.exit(1);
}

async function main() {
  // ── Active hours check (08:00-21:00 WIB = 01:00-14:00 UTC) ──
  const now = new Date();
  const utcHour = now.getUTCHours();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat

  if (day === 0 || day === 6) {
    console.log("[community-agent] Skipping: weekend");
    process.exit(0);
  }
  if (utcHour < 1 || utcHour >= 14) {
    console.log("[community-agent] Skipping: outside active hours (08:00-21:00 WIB)");
    process.exit(0);
  }

  // ── Random delay 0-30 min → effective interval 30-60 min ──
  const delayMinutes = Math.floor(Math.random() * 30);
  console.log(`[community-agent] Running at ${now.toISOString()} (delay: ${delayMinutes} min)`);
  await new Promise(r => setTimeout(r, delayMinutes * 60 * 1000));

  console.log(`[community-agent] Calling API at ${new Date().toISOString()}`);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CRON_SECRET}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[community-agent] Failed: ${response.status} ${text}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`[community-agent] Result:`, JSON.stringify(result.data, null, 2));
}

main()
  .catch((e) => {
    console.error("[community-agent] Error:", e);
    process.exit(1);
  });
