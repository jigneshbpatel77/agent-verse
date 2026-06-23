import type { KafkaTopic } from './topics';

export interface EventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  topic: KafkaTopic;
  tenantId: string;
  aggregateId: string;
  correlationId?: string;
  causationId?: string;
  payload: TPayload;
  occurredAt: string;
  schemaVersion: number;
}
