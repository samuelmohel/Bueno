import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Public()
  @Get('quote')
  @ApiOperation({ summary: 'Live wagon quote — no auth required (used on landing page)' })
  getQuote(@Query('routeId') routeId: string, @Query('cargoTypeId') cargoTypeId: string, @Query('weight') weight: string) {
    return this.bookings.getQuote(routeId, cargoTypeId, Number(weight));
  }

  @Public()
  @Get('track/:code')
  @ApiOperation({ summary: 'Public shipment tracking by Tracking ID / Booking Code — no auth required' })
  trackByCode(@Param('code') code: string) {
    return this.bookings.findByBookingCode(code);
  }


  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    const isCustomer = user.role === 'CUSTOMER';
    return this.bookings.findAll({ ...query, customerId: isCustomer ? user.id : undefined });
  }

  @Get('stats')
  getStats() { return this.bookings.getStats(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.bookings.findById(id); }

  @Post(':id/pay')
  initPayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookings.initializePayment(id, user.id);
  }

  @Post('verify/:ref')
  verifyPayment(@Param('ref') ref: string, @CurrentUser() user: any) {
    return this.bookings.verifyPayment(ref, user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.updateStatus(id, body.status, user.id, body.description, body.lat, body.lng);
  }

  @Post(':id/allocate')
  allocateWagons(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.allocateWagons(id, body, user.id);
  }

  // ─── Cargo Inventory ────────────────────────────────────────────────────

  @Post('wagon-allocations/:wagonAllocationId/cargo-items')
  @ApiOperation({ summary: 'Log a cargo item loaded onto a wagon' })
  addCargoItem(@Param('wagonAllocationId') wagonAllocationId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.addCargoItem(wagonAllocationId, body, user.id);
  }

  @Patch('cargo-items/:itemId/unload')
  @ApiOperation({ summary: 'Confirm a cargo item unloaded at destination — same record used at loading' })
  unloadCargoItem(@Param('itemId') itemId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.unloadCargoItem(itemId, body, user.id);
  }

  @Post('cargo-items/:itemId/remove')
  @ApiOperation({ summary: 'Remove a cargo item logged in error, before it has been unloaded' })
  removeCargoItem(@Param('itemId') itemId: string) {
    return this.bookings.removeCargoItem(itemId);
  }
}
