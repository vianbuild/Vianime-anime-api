"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnimeSearch = getAnimeSearch;
const animeConfig_1 = __importDefault(require("../../configs/animeConfig"));
const dataFetcher_1 = require("../../services/dataFetcher");
async function getAnimeSearch(query) {
    const baseUrl = animeConfig_1.default.baseUrl.otakudesu;
    const url = `${baseUrl}/?s=${encodeURIComponent(query)}&post_type=anime`;
    return (0, dataFetcher_1.wajikFetch)(url, baseUrl, {
        method: "GET",
        responseType: "text",
        timeout: 15000,
    });
}
