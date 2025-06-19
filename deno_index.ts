import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

async function handler(req: Request): Promise<Response> {
  const incomingUrl = new URL(req.url);
  const pathname = incomingUrl.pathname;

  if (pathname === "/") {
    return new Response("此地址只用于为 astrbot 提供更快速的 GitHub 访问服务", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 去掉路径前导斜杠并分割出主机部分，例如：/github.com/login → host = github.com, path = /login
  const pathParts = pathname.slice(1).split("/");
  const host = pathParts[0];
  const subpath = "/" + pathParts.slice(1).join("/");

  if (!host || !subpath) {
    return new Response("Invalid path. Usage: /<host>/<path>", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const targetUrlString = `https://${host}${subpath}`;
  console.log(`Proxying request to: ${targetUrlString}`);

  try {
    const response = await fetch(targetUrlString, {
      headers: req.headers,
      method: req.method,
      body: req.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, *");

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: responseHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`Error fetching ${targetUrlString}:`, error);
    return new Response(`Failed to proxy request to ${targetUrlString}: ${error.message}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

console.log("此地址只用于帮助 astrbot 更快的连接 GitHub");
serve(handler);
