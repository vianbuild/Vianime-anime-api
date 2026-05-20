import axios, {
  type AxiosError,
  type AxiosResponse,
  type AxiosRequestConfig,
} from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { buildBrowserHeaders, BROWSER_USER_AGENT } from "./browserHeaders";

export { BROWSER_USER_AGENT };

const DEFAULT_AXIOS_CONFIG: AxiosRequestConfig = {
  maxRedirects: 10,
  timeout: 25000,
  decompress: true,
  validateStatus: (status) => status >= 200 && status < 400,
};

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl =
    process.env.SCRAPER_HTTP_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();

  if (!proxyUrl) return undefined;

  return new HttpsProxyAgent(proxyUrl);
}

/** GET/HEAD ke root path situs sumber (mis. /home → baseUrl/). */
function isColdTopLevelNavigation(
  url: string,
  ref: string,
  axiosConfig?: AxiosRequestConfig
): boolean {
  const method = (axiosConfig?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;

  const headers = axiosConfig?.headers;
  if (headers?.Referer || headers?.referer || headers?.Origin || headers?.origin) {
    return false;
  }

  try {
    const target = new URL(url);
    const base = new URL(ref);
    if (target.origin !== base.origin) return false;

    const path = target.pathname.replace(/\/$/, "") || "";
    return path === "";
  } catch {
    return false;
  }
}

function mergeAxiosConfig(
  url: string,
  ref: string,
  axiosConfig?: AxiosRequestConfig
): AxiosRequestConfig {
  const referer =
    axiosConfig?.headers?.Referer?.toString() ||
    axiosConfig?.headers?.referer?.toString() ||
    ref;

  const proxyAgent = getProxyAgent();
  const coldNavigation = isColdTopLevelNavigation(url, ref, axiosConfig);

  return {
    ...DEFAULT_AXIOS_CONFIG,
    ...axiosConfig,
    headers: {
      ...buildBrowserHeaders(referer, ref, { coldNavigation }),
      ...axiosConfig?.headers,
    },
    ...(proxyAgent ? { httpsAgent: proxyAgent, httpAgent: proxyAgent, proxy: false } : {}),
  };
}

function toHttpError(error: unknown): { status: number; message: string } {
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError;
    const status = axErr.response?.status ?? axErr.status ?? 500;
    const message =
      axErr.response?.statusText ||
      axErr.message ||
      `Request failed with status code ${status}`;

    return { status, message };
  }

  if (error && typeof error === "object" && "status" in error) {
    const e = error as { status?: number; message?: string };
    return {
      status: typeof e.status === "number" ? e.status : 500,
      message: e.message || "Terjadi kesalahan",
    };
  }

  return { status: 500, message: error instanceof Error ? error.message : "Terjadi kesalahan" };
}

/** Lempar error dengan shape yang dikenali errorHandler Express. */
export function throwHttpError(error: unknown): never {
  const { status, message } = toHttpError(error);
  throw { status, message };
}

export async function wajikFetch(
  url: string,
  ref: string,
  axiosConfig?: AxiosRequestConfig,
  callback?: (response: AxiosResponse) => void
): Promise<any> {
  const config = mergeAxiosConfig(url, ref, {
    ...axiosConfig,
    method: axiosConfig?.method ?? "GET",
  });

  try {
    const response = await axios(url, config);

    if (callback) callback(response);

    return response.data;
  } catch (firstError) {
    const first = toHttpError(firstError);

    // Satu kali retry ringan untuk 403/429 (rate limit / challenge sementara)
    if (first.status === 403 || first.status === 429) {
      await new Promise((r) => setTimeout(r, 1200));

      try {
        const retryResponse = await axios(url, config);
        if (callback) callback(retryResponse);
        return retryResponse.data;
      } catch (retryError) {
        throwHttpError(retryError);
      }
    }

    throwHttpError(firstError);
  }
}

export async function getFinalUrl(
  url: string,
  ref: string,
  axiosConfig?: AxiosRequestConfig
): Promise<string> {
  try {
    const response = await axios.head(url, {
      ...mergeAxiosConfig(url, ref, axiosConfig),
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const location = response.headers["location"];
    if (location) return location;

    return url;
  } catch (error) {
    throwHttpError(error);
  }
}

export async function getFinalUrls(
  urls: string[],
  ref: string,
  config: {
    axiosConfig?: AxiosRequestConfig;
    retryConfig?: {
      retries?: number;
      delay?: number;
    };
  }
): Promise<string[]> {
  const { retries = 3, delay = 1000 } = config.retryConfig || {};

  const retryRequest = async (url: string): Promise<string> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await getFinalUrl(url, ref, config.axiosConfig);
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return "";
  };

  const requests = urls.map((url) => retryRequest(url));
  const responses = await Promise.allSettled(requests);

  return responses.map((response) => {
    if (response.status === "fulfilled") return response.value;
    return "";
  });
}
