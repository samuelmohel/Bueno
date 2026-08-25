import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routes')
export class RoutesController {
  constructor(private routes: RoutesService) {}

  @Public()
  @Get()
  findAll() { return this.routes.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.routes.findById(id); }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @ApiBearerAuth()
  @Post()
  create(@Body() b: any) { return this.routes.create(b); }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() b: any) { return this.routes.update(id, b); }
}
