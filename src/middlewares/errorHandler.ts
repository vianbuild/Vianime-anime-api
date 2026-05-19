import type { NextFunction, Request, Response } from "express";
import axios from "axios";
import generatePayload from "@helpers/payload";

function resolveError(err: any): { status: number; message: string } {
  if (typeof err?.status === "number") {
    return {
      status: err.status,
      message: err.message || "",
    };
  }

  if (axios.isAxiosError(err)) {
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

export default function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const { status, message } = resolveError(err);

  if (status < 500) {
    return res.status(status).json(generatePayload(res, { message }));
  }

  res.status(500).json(generatePayload(res, { message }));
}
