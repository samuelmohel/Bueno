import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get('live')
  getLive() { return this.tracking.getLiveFleet(); }

  @Get('loco/:id')
  getLoco(@Param('id') id: string) { return this.tracking.getLocoLocation(id); }

  @Get('loco/:id/history')
  getHistory(@Param('id') id: string, @Query('hours') h?: string) {
    return this.tracking.getLocoHistory(id, Number(h) || 24);
  }

  @Get('booking/:id')
  getBooking(@Param('id') id: string) { return this.tracking.getBookingTrackingInfo(id); }

  // GPS hardware endpoint — @Public() bypasses JWT so physical trackers can POST
  @Public()
  @Post('gps/:serialNumber')
  ingestGps(
    @Param('serialNumber') serialNumber: string,
    @Body() body: { lat: number; lng: number; speed?: number; heading?: number; signalQuality?: string },
  ) {
    return this.tracking.ingestGpsPoint(serialNumber, body.lat, body.lng, body.speed, body.heading, body.signalQuality);
  }

  // Simulation endpoint for Admin/Ops demo controls
  @Post('simulate')
  simulateMovement(
    @Body() body: { locoId: string; lat: number; lng: number; signalQuality?: string },
  ) {
    return this.tracking.simulateMovement(body.locoId, body.lat, body.lng, body.signalQuality);
  }
}