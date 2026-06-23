export class LiveUpdatesGateway {
  publish(event: { topic: string; payload: unknown }): void {
    // TODO: bridge Kafka events to WebSocket/SSE clients.
    void event;
  }
}
