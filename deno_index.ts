import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// 设置允许代理的 GitHub 域名
const ALLOWED_HOSTS = {
  "github": "https://github.com",
  "raw": "https://raw.githubusercontent.com",
  "gist": "https://gist.github.com",
  "api": "https://api.github.com",
};

function withCORS(resp: Response): Response {
  const newHeaders = new Headers(resp.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Headers", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(resp.body, {
    status: resp.status,
    headers: newHeaders,
  });
}

serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 处理预检请求
  if (req.method === "OPTIONS") {
    return withCORS(new Response(null, { status: 204 }));
  }

  // 路径格式应为 /{hostType}/github/path
  const [_, hostType, ...pathParts] = pathname.split("/");

  const targetHost = ALLOWED_HOSTS[hostType];
  if (!targetHost) {
    return withCORS(new Response("不支持的代理类型", { status: 400 }));
  }

  const targetUrl = `${targetHost}/${pathParts.join("/")}${url.search}`;
  console.log(`📦 Proxying: ${targetUrl}`);

  try {
    const upstreamResp = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    const body = await upstreamResp.arrayBuffer();
    return withCORS(new Response(body, {
      status: upstreamResp.status,
      headers: upstreamResp.headers,
    }));
  } catch (err) {
    return withCORS(new Response(`代理失败：${err.message}`, { status: 502 }));
  }
});
