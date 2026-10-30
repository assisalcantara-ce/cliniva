import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://cristianealcantara.com.br",
  "https://www.cristianealcantara.com.br",
]);

// Em desenvolvimento, permite localhost
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.add("http://localhost:3000");
  ALLOWED_ORIGINS.add("http://localhost:3001");
  ALLOWED_ORIGINS.add("http://localhost:5173");
  ALLOWED_ORIGINS.add("http://127.0.0.1:3000");
  ALLOWED_ORIGINS.add("http://127.0.0.1:3001");
}

export function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Vary": "Origin",
  };

  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Therapist-Public-Key, Authorization";
    headers["Access-Control-Max-Age"] = "86400";
  }

  return headers;
}

export function handleOptionsCors(req: NextRequest): NextResponse {
  const headers = getCorsHeaders(req);
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

export function applyCors(res: NextResponse, req: NextRequest): NextResponse {
  const cors = getCorsHeaders(req);
  for (const [key, value] of Object.entries(cors)) {
    res.headers.set(key, value);
  }
  return res;
}
