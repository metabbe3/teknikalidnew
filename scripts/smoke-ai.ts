import { runScript } from "./lib/run";
import { aiChat } from "../src/lib/ai-client";

/** Fast smoke test: confirms the Anthropic-shim AI client reaches the provider. */
runScript("smoke-ai", async () => {
  const r = await aiChat("You are a connectivity test.", "Reply with exactly: ZAI_OK", 50);
  console.log("RESP:", r.slice(0, 120));
});
