import { Controller, Get, HttpException, HttpStatus, Param } from '@nestjs/common';

const analyticsAgentBaseUrl = process.env.ANALYTICS_AGENT_URL ?? 'http://127.0.0.1:8010';

@Controller('api/analytics/system')
export class AnalyticsController {
  @Get('services')
  async services() {
    return proxyAnalyticsAgent('/api/v1/system/services');
  }

  @Get(':serviceKey/health')
  async serviceHealth(@Param('serviceKey') serviceKey: string) {
    return proxyAnalyticsAgent(`/api/v1/system/${encodeURIComponent(serviceKey)}/health`);
  }

  @Get(':serviceKey/metrics/discover')
  async discoverServiceMetrics(@Param('serviceKey') serviceKey: string) {
    return proxyAnalyticsAgent(`/api/v1/system/${encodeURIComponent(serviceKey)}/metrics/discover`);
  }
}

async function proxyAnalyticsAgent(path: string) {
  let response: Response;

  try {
    response = await fetch(new URL(path, analyticsAgentBaseUrl));
  } catch (error) {
    throw new HttpException(
      {
        message: 'Analytics Agent is unavailable',
        cause: error instanceof Error ? error.message : 'unknown error',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new HttpException(payload, response.status);
  }

  return payload;
}

async function parseResponseBody(response: Response): Promise<string | Record<string, unknown>> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
