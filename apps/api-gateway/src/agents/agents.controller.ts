import { Controller, Get } from '@nestjs/common';

@Controller('agents')
export class AgentsController {
  @Get()
  listAgents() {
    return {
      agents: [
        'analytics-agent',
        'research-agent',
        'architecture-agent',
        'engineering-agent',
        'security-agent',
        'quality-agent',
        'content-agent',
        'legal-finance-agent',
        'orchestration-agent',
        'product-agent',
        'devops-agent',
        'growth-agent',
        'support-agent',
      ],
    };
  }
}
