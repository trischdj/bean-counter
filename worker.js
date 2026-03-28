/**
 * Cloudflare Worker — Anthropic API Proxy
 * 
 * Setup:
 *  1. Deploy this file to Cloudflare Workers
 *  2. Add an environment variable named ANTHROPIC_API_KEY in the
 *     Worker's Settings → Variables panel
 *  3. Set ALLOWED_ORIGIN below to your GitHub Pages URL
 *     e.g. "https://your-username.github.io"
 *     Use "*" during local testing only.
 */

const ALLOWED_ORIGIN = "https://your-username.github.io"; // ← update this
const ANTHROPIC_URL  = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VER  = "2023-06-01";

export default {
  async fetch(request, env) {

    // ── CORS preflight ──
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, env);
    }

    // ── Only allow POST ──
    if (request.method !== "POST") {
      return corsResponse(JSON.stringify({ error: "Method not allowed" }), 405, env);
    }

    // ── Check origin ──
    const origin = request.headers.get("Origin") || "";
    if (ALLOWED_ORIGIN !== "*" && origin !== ALLOWED_ORIGIN) {
      return corsResponse(JSON.stringify({ error: "Forbidden" }), 403, env);
    }

    // ── Forward to Anthropic ──
    try {
      const body = await request.json();

      const upstream = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         env.ANTHROPIC_API_KEY,
          "anthropic-version": ANTHROPIC_VER,
        },
        body: JSON.stringify(body),
      });

      const data = await upstream.json();
      return corsResponse(JSON.stringify(data), upstream.status, env);

    } catch (err) {
      return corsResponse(JSON.stringify({ error: "Proxy error", detail: err.message }), 500, env);
    }
  }
};

// ── Helper: attach CORS headers to every response ──
function corsResponse(body, status, env) {
  const headers = {
    "Content-Type":                "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
  };
  return new Response(body, { status, headers });
}
