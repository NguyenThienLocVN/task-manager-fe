import { NextRequest } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/lib/auth/proxy";

async function proxyRequest(
  request: NextRequest,
  context: RouteContext<"/api/[...path]">,
) {
  const { path } = await context.params;
  return proxyAuthenticatedApiRequest(request, path);
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
