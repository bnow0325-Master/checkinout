import { isIP } from "node:net";

const OFFICE_ALLOWED_IPS = process.env.OFFICE_ALLOWED_IPS ?? "";

function normalizeIp(value: string) {
  let ip = value.trim();
  if (!ip) return null;

  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice("::ffff:".length);
  }

  return isIP(ip) ? ip : null;
}

function ipv4ToNumber(ip: string) {
  return ip.split(".").reduce((acc, part) => acc * 256 + Number(part), 0);
}

function isIpv4CidrMatch(ip: string, cidr: string) {
  const [network, prefixRaw] = cidr.split("/");
  const prefix = Number(prefixRaw);
  if (!network || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const normalizedNetwork = normalizeIp(network);
  if (!normalizedNetwork || isIP(normalizedNetwork) !== 4 || isIP(ip) !== 4) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (
    (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(normalizedNetwork) & mask)
  );
}

export function hasOfficeIpAllowlist() {
  return OFFICE_ALLOWED_IPS.split(",").some((entry) => entry.trim());
}

export function getClientIp(headers: Headers) {
  const rawIp =
    headers.get("x-vercel-forwarded-for") ??
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip");

  if (!rawIp) return null;

  for (const part of rawIp.split(",")) {
    const ip = normalizeIp(part);
    if (ip) return ip;
  }

  return null;
}

export function isOfficeIpAllowed(clientIp: string | null) {
  const normalizedClientIp = clientIp ? normalizeIp(clientIp) : null;
  if (!normalizedClientIp) return false;

  return OFFICE_ALLOWED_IPS.split(",").some((entry) => {
    const rule = entry.trim();
    if (!rule) return false;

    if (rule.includes("/")) {
      return isIpv4CidrMatch(normalizedClientIp, rule);
    }

    return normalizeIp(rule) === normalizedClientIp;
  });
}
