import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  constructor(private chat: ChatService) {}

  handleConnection(client: Socket) { this.logger.log(`Chat client connected: ${client.id}`); }
  handleDisconnect(client: Socket) { this.logger.log(`Chat client disconnected: ${client.id}`); }

  @SubscribeMessage('join:booking')
  handleJoin(@MessageBody() data: { bookingId: string }, @ConnectedSocket() client: Socket) {
    client.join(`booking:${data.bookingId}`);
    return { joined: data.bookingId };
  }

  @SubscribeMessage('chat:send')
  async handleMessage(@MessageBody() data: { bookingId: string; senderId: string; content: string; attachmentUrl?: string }, @ConnectedSocket() client: Socket) {
    const message = await this.chat.sendMessage(data.bookingId, data.senderId, data.content, data.attachmentUrl);
    this.server.to(`booking:${data.bookingId}`).emit('chat:message', message);
    return message;
  }
}
