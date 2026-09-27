// Static prefix → ISO country map (Indonesia-centric), shared by API + any consumer.
// Maintained at ~/.hermes/scripts/geo_prefix_map.py (seed) — this is the app-side copy.
// Unknown = "??" — never guess (NORTH STAR: data reliable).

const PREFIXES: Record<string, string> = {
  // Indonesia — Telkomsel / Telkom / Indihome / local ISPs
  "180.247": "ID", "180.248": "ID", "180.249": "ID", "180.250": "ID", "180.214": "ID",
  "182.253": "ID", "182.3": "ID", "118.99": "ID", "118.136": "ID", "114.5": "ID",
  "114.6": "ID", "114.8": "ID", "114.10": "ID", "114.120": "ID", "114.122": "ID",
  "114.124": "ID", "114.125": "ID", "114.134": "ID", "114.142": "ID", "112.78": "ID",
  "112.198": "ID", "112.215": "ID", "103.10": "ID", "103.28": "ID", "103.246": "ID",
  "101.0": "ID", "36.66": "ID", "36.68": "ID", "36.70": "ID", "36.72": "ID",
  "36.76": "ID", "36.77": "ID", "36.79": "ID", "39.226": "ID", "49.50": "ID",
  "60.253": "ID", "61.5": "ID", "64.110": "ID", "103.85": "ID", "103.147.9": "ID",
  "202.43": "ID", "202.51": "ID", "202.62": "ID", "202.67": "ID", "202.80": "ID",
  "202.87": "ID", "202.93": "ID", "202.95": "ID", "202.129": "ID", "202.148": "ID",
  "202.150": "ID", "202.152": "ID", "202.153": "ID", "202.159": "ID", "202.162": "ID",
  "202.169": "ID", "202.173": "ID", "203.77": "ID", "203.78": "ID", "203.80": "ID",
  "203.123": "ID", "203.130": "ID", "203.153": "ID", "219.83": "ID", "222.124": "ID",
  "2400:9a00": "ID", "2400:9a80": "ID", "2400:cbc0": "ID", "2404:80": "ID", "2404:c0": "ID",
  "2404:8000": "ID", "2404:8600": "ID", "2405:cc00": "ID", "2406:3000": "ID",
  "2406:da00": "ID", "2407:1400": "ID", "2407:9000": "ID", "2409:8c": "ID",
  "240a:2000": "ID", "2001:448a": "ID",
  // Common non-ID clouds/CDN egress seen in logs
  "2a01:4f8": "DE", "2a01:4a0": "DE", "185.60": "IE", "31.13": "IE", "69.171": "US",
  "66.220": "US", "173.252": "US", "157.240": "IE", "129.134": "IE", "102.132": "ZA",
  "41.66": "NG", "105.112": "NG", "197.210": "NG", "41.58": "NG", "41.203": "NG",
  "41.90": "KE", "41.79": "KE", "154.66": "KE", "196.201": "KE", "105.161": "KE",
  "156.155": "NG", "164.160": "NG", "219.100": "JP", "219.74": "JP", "113.11": "TH",
  "5.183": "NL",
};

export function geoLookup(ip: string): string {
  if (ip.includes(":")) {
    const parts = ip.split(":");
    for (const n of [3, 2, 1]) {
      const p = parts.slice(0, n).join(":");
      if (PREFIXES[p]) return PREFIXES[p];
    }
    return "??";
  }
  const parts = ip.split(".");
  for (const n of [3, 2, 1]) {
    const p = parts.slice(0, n).join(".");
    if (PREFIXES[p]) return PREFIXES[p];
  }
  return "??";
}
