"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = errorHandler;
const axios_1 = __importDefault(require("axios"));
const payload_1 = __importDefault(require("../helpers/payload"));
function resolveError(err) {
    if (typeof err?.status === "number") {
        return {
            status: err.status,
            message: err.message || "",
        };
    }
    if (axios_1.default.isAxiosError(err)) {
        const status = err.response?.status ?? err.status ?? 500;
        return {
            status,
            message: err.message || `Request failed with status code ${status}`,
        };
    }
    return {
        status: 500,
        message: err?.message || "Terjadi kesalahan tak terduga",
    };
}
function errorHandler(err, req, res, next) {
    const { status, message } = resolveError(err);
    if (status < 500) {
        return res.status(status).json((0, payload_1.default)(res, { message }));
    }
    res.status(500).json((0, payload_1.default)(res, { message }));
}
