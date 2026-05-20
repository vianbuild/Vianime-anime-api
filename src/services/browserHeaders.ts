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

export type BuildBrowserHeadersOptions = {
  /** Navigasi top-level pertama (buka langsung URL), tanpa Origin/Referer. */
  coldNavigation?: boolean;
};

const SHARED_DOCUMENT_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "sec-ch-ua": '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

function appendCookie(headers: Record<string, string>): Record<string, string> {
  const cookie = process.env.OTAKUDESU_COOKIE?.trim();
  if (cookie) {
    headers.Cookie = cookie;
  }
  return headers;
}

export function buildBrowserHeaders(
  referer: string,
  baseUrl?: string,
  options?: BuildBrowserHeadersOptions
): Record<string, string> {
  if (options?.coldNavigation) {
    return appendCookie({
      ...SHARED_DOCUMENT_HEADERS,
      "Sec-Fetch-Site": "none",
      Priority: "u=0, i",
    });
  }

  const origin = baseUrl ? resolveOrigin(baseUrl) : resolveOrigin(referer);
  const sameSite = referer.startsWith(origin);

  const headers: Record<string, string> = {
    ...SHARED_DOCUMENT_HEADERS,
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: referer,
    Origin: origin,
    "Sec-Fetch-Site": sameSite ? "same-origin" : "cross-site",
  };

  return appendCookie(headers);
}
