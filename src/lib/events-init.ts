import "@/domains/notification/notification.service";
import "@/domains/reputation/reputation.service";
import { initSocketBridge } from "@/domains/notification/socket-bridge";

if (process.env.NEXT_RUNTIME === "nodejs") {
  try {
    initSocketBridge();
  } catch {}
}
