import { proxyPublicGet } from "@/lib/auth/server";

export function GET() {
  return proxyPublicGet("/organizations");
}
