import { NextRequest } from "next/server";

// Disable Next.js body parsing — stream the raw request directly to the backend
export const config = { api: { bodyParser: false } };

// No size limit on this route
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const backendPort =
    process.env.DEVHUB_BACKEND_PORT ||
    process.env.BACKEND_PORT ||
    "8001";

  const backendUrl = `http://localhost:${backendPort}/api/transcribe`;

  // Forward headers except host
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") headers.set(key, value);
  });

  const upstream = await fetch(backendUrl, {
    method: "POST",
    headers,
    body: req.body,
    // @ts-expect-error — Node fetch requires this to stream without buffering
    duplex: "half",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
