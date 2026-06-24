import { NextRequest, NextResponse } from 'next/server';

const analyticsAgentBaseUrl = process.env.ANALYTICS_AGENT_BASE_URL ?? 'http://127.0.0.1:8010';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAnalyticsAgent(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAnalyticsAgent(request, context);
}

async function proxyAnalyticsAgent(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const upstreamUrl = new URL(path.join('/'), analyticsAgentBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' ? undefined : await request.text(),
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}
