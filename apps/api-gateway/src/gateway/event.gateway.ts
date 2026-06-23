import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('EventGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_workflows')
  handleSubscribeWorkflows(client: Socket, payload: any) {
    client.join('workflows_room');
    return { status: 'subscribed', room: 'workflows_room' };
  }

  // Broadcaster helper for incoming Kafka events mapped to the clients
  broadcastAgentEvent(topic: string, data: any) {
    this.server.to('workflows_room').emit('agent_event', { topic, data });
  }
}
