export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (!key) {
      return new Response("No file specified", { status: 400 });
    }

    const obj = await env.R2.get(key);   // 👈 binding name confirmed
    if (!obj) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType || "video/quicktime",
        "Accept-Ranges": "bytes",          // allows seeking in video players
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
};