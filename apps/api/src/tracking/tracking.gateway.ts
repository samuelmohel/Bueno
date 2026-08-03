import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => TrackingService))
    private readonly tracking: TrackingService,
  ) {}

  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @MessageBody() data: { locoId: string; lat: number; lng: number; speed?: number; heading?: number },
  ) {
    return this.tracking.updateLocoLocation(data);
  }

  @SubscribeMessage('subscribe:loco')
  handleSubscribeLoco(@MessageBody() data: { locoId: string }, @ConnectedSocket() client: Socket) {
    client.join(`loco:${data.locoId}`);
    return this.tracking.getLocoLocation(data.locoId);
  }

  @SubscribeMessage('subscribe:booking')
  handleSubscribeBooking(@MessageBody() data: { bookingId: string }, @ConnectedSocket() client: Socket) {
    client.join(`booking:${data.bookingId}`);
    return this.tracking.getBookingTrackingInfo(data.bookingId);
  }

  @SubscribeMessage('fleet:snapshot')
  handleFleetSnapshot(@ConnectedSocket() client: Socket) {
    client.join('fleet:ops');
    return this.tracking.getLiveFleet();
  }

  // Called internally by TrackingService after every GPS ping
  broadcastLocoPosition(payload: {
    locoId: string; serialNumber?: string;
    lat: number; lng: number;
    speed?: number; heading?: number;
    signalQuality?: string;
    fuelLevelPercent?: number; status?: string;
  }) {
    this.server.to('fleet:ops').emit('loco:position', payload);
    this.server.to(`loco:${payload.locoId}`).emit('loco:position', payload);
  }


  broadcastBookingStatus(bookingId: string, status: string, event: any) {
    this.server.to(`booking:${bookingId}`).emit('booking:status', { bookingId, status, event });
  }
}