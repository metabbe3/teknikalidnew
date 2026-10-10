#!/usr/bin/env python3
"""GSC manual 'Minta pengindeksan' via CDP UI-fill v2 — IIFE invocation fixed."""
import asyncio, json, re, urllib.request as _ur
import websockets

CDP_HTTP = "http://127.0.0.1:9222/json"
GSC_HOME = "https://search.google.com/search-console?resource_id=sc-domain%3Ateknikal.id"

URLS = [
    "https://teknikal.id/saham-golden-cross",
    "https://teknikal.id/akademi/cara-membaca-halaman-analisa-saham",
    "https://teknikal.id/akademi/ema-cross-arti-sinyal-ema12-ema26-dan-strategi-saham",
    "https://teknikal.id/berita/rekap-pasar-2026-09-september",
    "https://teknikal.id/berita/rekap-pasar-mingguan-2026-10-03",
    "https://teknikal.id/berita/brief-pasar-idx-2026-10-08-pasar-berbalik-merah",
]

FILL_JS = """(u => {
  const inp = document.querySelector('input[aria-label*="URL" i], input[placeholder*="URL" i], input[type="text"]');
  if (!inp) return 'NO_INPUT';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, u);
  inp.dispatchEvent(new Event('input', {bubbles: true}));
  return 'OK';
})"""

ENTER_JS = """(() => {
  const inp = document.querySelector('input[aria-label*="URL" i], input[placeholder*="URL" i], input[type="text"]');
  if (!inp) return 'NO_INPUT';
  for (const t of ['keydown','keypress','keyup']) {
    inp.dispatchEvent(new KeyboardEvent(t, {key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true}));
  }
  const form = inp.closest('form');
  if (form) form.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
  return 'sent';
})()"""

CLICK_REQ_JS = """(() => {
  const cand = [...document.querySelectorAll('button, [role="button"], a')];
  const b = cand.find(x => /minta\\s+pengindeksan|request\\s+indexing/i.test((x.textContent || '') + ' ' + (x.getAttribute('aria-label') || '')));
  if (!b) return 'NO_REQ_BUTTON|' + cand.slice(0, 40).map(x => ((x.textContent || '').trim().slice(0, 25) || x.getAttribute('aria-label') || '').replace(/\\n/g, ' ')).filter(Boolean).join(' ;; ').slice(0, 500);
  b.click(); return 'CLICKED_REQ';
})()"""

CLICK_SEND_JS = """(() => {
  const cand = [...document.querySelectorAll('button, [role="button"]')];
  const b = cand.find(x => /^\\s*(kirim\\s+permintaan|send\\s+(the\\s+)?request|selesai|done|ok)\\s*$/i.test((x.textContent || '').trim()) && (x.textContent || '').trim().length > 1);
  if (!b) return 'NO_SEND_BUTTON';
  b.click(); return 'CLICKED_SEND:' + (b.textContent || '').trim();
})()"""

def scan(txt):
    st = {}
    if "Pengindeksan diminta" in txt or "Indexing requested" in txt or "URL telah didaftarkan" in txt:
        st["final"] = "REQUESTED_OK"
    if "URL ada di Google" in txt or "URL berada di Google" in txt:
        st["in_google"] = "YES"
    elif "URL tidak ada di Google" in txt:
        st["in_google"] = "NO"
    if "Live" in txt and "pengujian" in txt.lower():
        st["live_test"] = "seen"
    return st

async def main():
    tabs = json.load(_ur.urlopen(CDP_HTTP, timeout=5))
    tab = next((t for t in tabs if t.get("type") == "page" and "search.google.com" in t.get("url", "")), None)
    if not tab:
        print("NO_GSC_TAB"); return
    async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=10**7) as ws:
        mid = 0
        async def send(method, params=None, timeout=60):
            nonlocal mid; mid += 1
            await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=timeout))
                if msg.get("id") == mid:
                    if "error" in msg: raise RuntimeError(msg["error"])
                    return msg.get("result", {})
        async def ev(expr):
            r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
            return r.get("result", {}).get("value")

        out = []
        for i, u in enumerate(URLS):
            d = {"url": u}
            await send("Page.navigate", {"url": GSC_HOME})
            await asyncio.sleep(8)
            fill = await ev(FILL_JS + "('" + u + "')")
            if str(fill) != "OK":
                d["err"] = "FILL_" + str(fill); out.append(d); print(json.dumps(d, ensure_ascii=False), flush=True); continue
            await ev(ENTER_JS)
            await asyncio.sleep(15)
            txt = await ev("document.body.innerText") or ""
            d.update(scan(txt))
            req = await ev(CLICK_REQ_JS)
            d["click_req"] = str(req)[:600]
            if str(req) == "CLICKED_REQ":
                for attempt in range(16):  # sampai 80 dtk: live-test + konfirmasi
                    await asyncio.sleep(5)
                    snd = await ev(CLICK_SEND_JS)
                    if str(snd).startswith("CLICKED_SEND"):
                        d.setdefault("click_send", []).append(str(snd)[:40])
                    txt = await ev("document.body.innerText") or ""
                    d.update(scan(txt))
                    if d.get("final") == "REQUESTED_OK":
                        break
                txt = await ev("document.body.innerText") or ""
                d.update(scan(txt))
                d["tail"] = (txt or "")[-300:]
            out.append(d)
            print(json.dumps(d, ensure_ascii=False), flush=True)
        with open("/tmp/gsc_request_results.json", "w") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        print("SAVED", len(out))
asyncio.run(main())
