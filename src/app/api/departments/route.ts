import { proxyPublicGet } from "@/lib/auth/server";
import { proxyAuthenticatedApiRequest } from "@/lib/auth/proxy";
import { NextRequest } from "next/server";

export function GET() {
  return proxyPublicGet("/departments");
}

export function POST(request: NextRequest) {
  return proxyAuthenticatedApiRequest(request, ["departments"]);
}
