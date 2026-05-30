export interface ActivityEntry {
  action: string;
  timestamp: string;
  duration: number;
  status: "success" | "failed";
  metadata?: Record<string, unknown>;
}

const MAX_ENTRIES = 100;
const log: ActivityEntry[] = [];

export function pushActivity(entry: ActivityEntry) {
  log.unshift(entry);
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
}

export function getRecentActivity(count = 20): ActivityEntry[] {
  return log.slice(0, count);
}
