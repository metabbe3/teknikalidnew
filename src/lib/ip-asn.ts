/**
 * IP / ASN utilities for anti-abuse.
 * - DATACENTER_ASNS + DATACENTER_ORG_RE: detect hosting/datacenter origin.
 *   Providers spread across many ASNs (Hetzner alone has AS24940/AS215859/AS56624…),
 *   so we match on BOTH the AS number AND the org name (more reliable).
 * - getClientIp: prefer Cloudflare's true client IP.
 * - lookupAsn: cached ip-api.com lookup (batch endpoint, robust for IPv6).
 */

export const DATACENTER_ASNS = new Set<string>([
  "AS14618", // Amazon AWS
  "AS16509", // Amazon AWS
  "AS15169", // Google Cloud
  "AS8075", // Microsoft Azure
  "AS13335", // Cloudflare
  "AS24940", // Hetzner
  "AS215859", // Hetzner (IPv6/cloud block)
  "AS56624", // Hetzner
  "AS14061", // DigitalOcean
  "AS16276", // OVH
  "AS45102", // Alibaba Cloud
  "AS24534", // PT Transhybrid (Indonesian datacenter)
]);

// Org-name fallback — catches datacenter IPs whose ASN isn't in the set above.
const DATACENTER_ORG_RE =
  /hetzner|digital\s?ocean|ovhcloud|^ovh|amazon|aws|google\s?cloud|microsoft|azure|alibaba|linode|vultr|contabo|choopa|datacamp/i;

export function getClientIp(headers: Headers): string | null {
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    null
  );
}

export interface AsnInfo {
  asn: string | null;
  org: string | null;
}

const ASN_CACHE = new Map<string, { info: AsnInfo; expiresAt: number }>();
const ASN_TTL = 24 * 60 * 60 * 1000; // ASN rarely changes; cache 24h (respects ip-api's 45/min free tier)

/**
 * Lookup ASN + org for an IP via ip-api.com (batch endpoint, robust for IPv6).
 * Fail-soft: returns { asn: null, org: null } on error/timeout.
 */
export async function lookupAsn(ip: string): Promise<AsnInfo> {
  const cached = ASN_CACHE.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.info;

  const empty: AsnInfo = { asn: null, org: null };
  try {
    const res = await fetch("http://ip-api.com/batch?fields=status,query,as,org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([ip]),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return empty;
    const arr = (await res.json()) as Array<{ status?: string; as?: string; org?: string }>;
    const data = arr[0] ?? {};
    // ip-api returns `as` like "AS215859 Hetzner Online GmbH" — extract the AS number.
    const asn = data.as ? data.as.split(" ")[0] : null;
    const info: AsnInfo = { asn, org: data.org ?? null };
    ASN_CACHE.set(ip, { info, expiresAt: Date.now() + ASN_TTL });
    if (ASN_CACHE.size > 2000) ASN_CACHE.delete(ASN_CACHE.keys().next().value as string);
    return info;
  } catch {
    return empty;
  }
}

/** A datacenter origin if the ASN is known OR the org name matches a hosting provider. */
export function isDatacenter(info: AsnInfo): boolean {
  if (info.asn && DATACENTER_ASNS.has(info.asn)) return true;
  if (info.org && DATACENTER_ORG_RE.test(info.org)) return true;
  return false;
}
