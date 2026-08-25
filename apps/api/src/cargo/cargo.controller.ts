import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CargoService } from './cargo.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('cargo-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cargo-types')
export class CargoController {
  constructor(private cargo: CargoService) {}

  @Public()
  @Get()
  findAll() { return this.cargo.findAll(); }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @ApiBearerAuth()
  @Post()
  create(@Body() body: any) { return this.cargo.create(body); }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.cargo.update(id, body); }
}
