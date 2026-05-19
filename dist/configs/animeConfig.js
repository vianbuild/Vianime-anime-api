"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const animeConfig = {
    PORT: 3001,
    baseUrl: {
        otakudesu: process.env.OTAKUDESU_BASE_URL?.trim() || "https://otakudesu.blog",
        samehadaku: process.env.SAMEHADAKU_BASE_URL?.trim() || "https://samehadaku.mba",
    },
    response: {
        href: true,
        sourceUrl: true,
    },
};
exports.default = animeConfig;
