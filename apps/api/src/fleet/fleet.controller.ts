import { CreateWagonDto } from './dto/create-wagon.dto';
import { UpdateWagonDto } from './dto/update-wagon.dto';
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FleetService } from './fleet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('fleet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fleet')
export class FleetController {
  constructor(private fleet: FleetService) {}

  @Get('wagons')       findWagons(@Query() q: any)   { return this.fleet.findWagons(q); }
  @Get('wagons/stats') getWagonStats()                { return this.fleet.getWagonStats(); }
  @Get('wagons/:id')   findWagon(@Param('id') id: string) { return this.fleet.findWagonById(id); }
  
  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post('wagons')      createWagon(@Body() b: CreateWagonDto)   { return this.fleet.createWagon(b); }
  
  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Patch('wagons/:id') updateWagon(@Param('id') id: string, @Body() b: UpdateWagonDto) { return this.fleet.updateWagon(id, b); }

  @Get('locos')        findLocos(@Query() q: any)    { return this.fleet.findLocos(q); }
  @Get('locos/:id')    findLoco(@Param('id') id: string) { return this.fleet.findLocoById(id); }
  
  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Post('locos')       createLoco(@Body() b: any)    { return this.fleet.createLoco(b); }
  
  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Patch('locos/:id')  updateLoco(@Param('id') id: string, @Body() b: any) { return this.fleet.updateLoco(id, b); }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.CARGO_OFFICER, UserRole.DRIVER)
  @Post('inspect')
  inspect(@Body() body: any, @CurrentUser() user: any) {
    return this.fleet.createInspection({ ...body, inspectedBy: user.id });
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS, UserRole.DRIVER)
  @Post('locos/:id/fuel')
  fuelLog(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.fleet.addFuelLog(id, user.id, body);
  }
}
