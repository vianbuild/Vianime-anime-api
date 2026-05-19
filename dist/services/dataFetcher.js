"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BROWSER_USER_AGENT = void 0;
exports.throwHttpError = throwHttpError;
exports.wajikFetch = wajikFetch;
exports.getFinalUrl = getFinalUrl;
exports.getFinalUrls = getFinalUrls;
const axios_1 = __importDefault(require("axios"));
const https_proxy_agent_1 = require("https-proxy-agent");
const browserHeaders_1 = require("./browserHeaders");
Object.defineProperty(exports, "BROWSER_USER_AGENT", { enumerable: true, get: function () { return browserHeaders_1.BROWSER_USER_AGENT; } });
const DEFAULT_AXIOS_CONFIG = {
    maxRedirects: 10,
    timeout: 25000,
    decompress: true,
    validateStatus: (status) => status >= 200 && status < 400,
};
function getProxyAgent() {
    const proxyUrl = process.env.SCRAPER_HTTP_PROXY?.trim() ||
        process.env.HTTPS_PROXY?.trim() ||
        process.env.HTTP_PROXY?.trim();
    if (!proxyUrl)
        return undefined;
    return new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
}
function mergeAxiosConfig(ref, axiosConfig) {
    const referer = axiosConfig?.headers?.Referer?.toString() ||
        axiosConfig?.headers?.referer?.toString() ||
        ref;
    const proxyAgent = getProxyAgent();
    return {
        ...DEFAULT_AXIOS_CONFIG,
        ...axiosConfig,
        headers: {
            ...(0, browserHeaders_1.buildBrowserHeaders)(referer, ref),
            ...axiosConfig?.headers,
        },
        ...(proxyAgent ? { httpsAgent: proxyAgent, httpAgent: proxyAgent, proxy: false } : {}),
    };
}
function toHttpError(error) {
    if (axios_1.default.isAxiosError(error)) {
        const axErr = error;
        const status = axErr.response?.status ?? axErr.status ?? 500;
        const message = axErr.response?.statusText ||
            axErr.message ||
            `Request failed with status code ${status}`;
        return { status, message };
    }
    if (error && typeof error === "object" && "status" in error) {
        const e = error;
        return {
            status: typeof e.status === "number" ? e.status : 500,
            message: e.message || "Terjadi kesalahan",
        };
    }
    return { status: 500, message: error instanceof Error ? error.message : "Terjadi kesalahan" };
}
function throwHttpError(error) {
    const { status, message } = toHttpError(error);
    throw { status, message };
}
async function wajikFetch(url, ref, axiosConfig, callback) {
    const config = mergeAxiosConfig(ref, { ...axiosConfig, method: axiosConfig?.method ?? "GET" });
    try {
        const response = await (0, axios_1.default)(url, config);
        if (callback)
            callback(response);
        return response.data;
    }
    catch (firstError) {
        const first = toHttpError(firstError);
        if (first.status === 403 || first.status === 429) {
            await new Promise((r) => setTimeout(r, 1200));
            try {
                const retryResponse = await (0, axios_1.default)(url, config);
                if (callback)
                    callback(retryResponse);
                return retryResponse.data;
            }
            catch (retryError) {
                throwHttpError(retryError);
            }
        }
        throwHttpError(firstError);
    }
}
async function getFinalUrl(url, ref, axiosConfig) {
    try {
        const response = await axios_1.default.head(url, {
            ...mergeAxiosConfig(ref, axiosConfig),
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400,
        });
        const location = response.headers["location"];
        if (location)
            return location;
        return url;
    }
    catch (error) {
        throwHttpError(error);
    }
}
async function getFinalUrls(urls, ref, config) {
    const { retries = 3, delay = 1000 } = config.retryConfig || {};
    const retryRequest = async (url) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await getFinalUrl(url, ref, config.axiosConfig);
            }
            catch (error) {
                if (attempt === retries)
                    throw error;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        return "";
    };
    const requests = urls.map((url) => retryRequest(url));
    const responses = await Promise.allSettled(requests);
    return responses.map((response) => {
        if (response.status === "fulfilled")
            return response.value;
        return "";
    });
}
