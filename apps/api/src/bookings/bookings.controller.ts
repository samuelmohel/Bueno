import { Controller, Get, Post, Patch, Param, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Public()
  @Post('webhook/paystack')
  @ApiOperation({ summary: 'Paystack payment webhook listener with HMAC verification' })
  handleWebhook(@Headers('x-paystack-signature') signature: string, @Body() body: any) {
    return this.bookings.handlePaystackWebhook(signature, body);
  }

  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    const isCustomer = user.role === 'CUSTOMER';
    return this.bookings.findAll({ ...query, customerId: isCustomer ? user.id : undefined });
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Get('stats')
  getStats() { return this.bookings.getStats(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.bookings.findById(id); }

  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post(':id/pay')
  initPayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookings.initializePayment(id, user.id);
  }

  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post('verify/:ref')
  verifyPayment(@Param('ref') ref: string, @CurrentUser() user: any) {
    return this.bookings.verifyPayment(ref, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.CARGO_OFFICER, UserRole.DRIVER)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.updateStatus(id, body.status, user.id, body.description, body.lat, body.lng);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post(':id/allocate')
  allocateWagons(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.allocateWagons(id, body, user.id);
  }

  // ─── Cargo Inventory ────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.CARGO_OFFICER)
  @Post('wagon-allocations/:wagonAllocationId/cargo-items')
  @ApiOperation({ summary: 'Log a cargo item loaded onto a wagon' })
  addCargoItem(@Param('wagonAllocationId') wagonAllocationId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.addCargoItem(wagonAllocationId, body, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.CARGO_OFFICER)
  @Patch('cargo-items/:itemId/unload')
  @ApiOperation({ summary: 'Confirm a cargo item unloaded at destination — same record used at loading' })
  unloadCargoItem(@Param('itemId') itemId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.bookings.unloadCargoItem(itemId, body, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.CARGO_OFFICER)
  @Post('cargo-items/:itemId/remove')
  @ApiOperation({ summary: 'Remove a cargo item logged in error, before it has been unloaded' })
  removeCargoItem(@Param('itemId') itemId: string) {
    return this.bookings.removeCargoItem(itemId);
  }

  // ─── Feeder Truck & Quality Audit (Field Spec) ───────────────────────────

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.CARGO_OFFICER)
  @Post('wagon-allocations/:wagonAllocationId/feeder-truck')
  @ApiOperation({ summary: 'Log feeder truck delivering cargo into rail wagon' })
  addFeederTruck(
    @Param('wagonAllocationId') wagonAllocationId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.bookings.addFeederTruckLog(wagonAllocationId, body, user.id);
  }

  @Get('wagon-allocations/:wagonAllocationId/feeder-trucks')
  @ApiOperation({ summary: 'Get feeder truck logs for a wagon allocation' })
  getFeederTrucks(@Param('wagonAllocationId') wagonAllocationId: string) {
    return this.bookings.getFeederTruckLogs(wagonAllocationId);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.CARGO_OFFICER)
  @Post('wagon-allocations/:wagonAllocationId/unload-audit')
  @ApiOperation({ summary: 'Submit destination wagon unload audit with burst bags and complaints' })
  submitUnloadAudit(
    @Param('wagonAllocationId') wagonAllocationId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.bookings.submitWagonUnloadAudit(wagonAllocationId, body, user.id);
  }

  @Get('wagon-allocations/:wagonAllocationId/unload-audit')
  @ApiOperation({ summary: 'Get wagon unload quality audit' })
  getUnloadAudit(@Param('wagonAllocationId') wagonAllocationId: string) {
    return this.bookings.getWagonUnloadAudit(wagonAllocationId);
  }
}
