/** Header set agar request axios lebih mirip browser Chrome di Windows. */
export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

export function resolveOrigin(referer: string): string {
  try {
    return new URL(referer).origin;
  } catch {
    return referer.replace(/\/$/, "");
  }
}

export function buildBrowserHeaders(referer: string, baseUrl?: string): Record<string, string> {
  const origin = baseUrl ? resolveOrigin(baseUrl) : resolveOrigin(referer);
  const sameSite = referer.startsWith(origin);

  const headers: Record<string, string> = {
    "User-Agent": BROWSER_USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: referer,
    Origin: origin,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": sameSite ? "same-origin" : "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "sec-ch-ua": '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
  };

  const cookie = process.env.OTAKUDESU_COOKIE?.trim();
  if (cookie) {
    headers.Cookie = cookie;
  }

  return headers;
}
