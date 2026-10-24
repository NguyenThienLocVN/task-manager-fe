import { proxyPublicGet } from "@/lib/auth/server";
import { proxyAuthenticatedApiRequest } from "@/lib/auth/proxy";
import { NextRequest } from "next/server";

export function GET() {
  return proxyPublicGet("/organizations");
}

export function POST(request: NextRequest) {
  return proxyAuthenticatedApiRequest(request, ["organizations"]);
}
