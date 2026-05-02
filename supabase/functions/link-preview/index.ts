import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractMeta(html: string, prop: string): string | null {
  // Handle both attribute orderings: property="x" content="y" and content="y" property="x"
  const a = html.match(
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"'<>]+)["']`, "i")
  );
  if (a) return decodeHtml(a[1].trim());
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']${prop}["']`, "i")
  );
  return b ? decodeHtml(b[1].trim()) : null;
}

function extractName(html: string, name: string): string | null {
  const a = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"'<>]+)["']`, "i")
  );
  if (a) return decodeHtml(a[1].trim());
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+name=["']${name}["']`, "i")
  );
  return b ? decodeHtml(b[1].trim()) : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: "invalid url" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DenBot/1.0; +https://github.com/Delimiters/den)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "upstream error" }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return new Response(JSON.stringify({ error: "not html" }), {
        status: 422,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Read first 64 KB — enough for <head> tags
    const reader = resp.body!.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 65536) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel();
    const html = new TextDecoder().decode(
      chunks.reduce((a, b) => {
        const c = new Uint8Array(a.length + b.length);
        c.set(a);
        c.set(b, a.length);
        return c;
      }, new Uint8Array(0))
    );

    const title =
      extractMeta(html, "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      parsed.hostname;

    const description =
      extractMeta(html, "og:description") ||
      extractName(html, "description") ||
      "";

    const image = extractMeta(html, "og:image");
    const siteName =
      extractMeta(html, "og:site_name") || parsed.hostname.replace(/^www\./, "");

    return new Response(
      JSON.stringify({ title, description, image, siteName }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
