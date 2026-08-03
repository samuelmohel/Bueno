import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
@ApiTags('routes') @UseGuards(JwtAuthGuard) @Controller('routes')
export class RoutesController {
  constructor(private routes: RoutesService) {}
  @Public() @Get() findAll() { return this.routes.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.routes.findById(id); }
  @ApiBearerAuth() @Post() create(@Body() b: any) { return this.routes.create(b); }
  @ApiBearerAuth() @Patch(':id') update(@Param('id') id: string, @Body() b: any) { return this.routes.update(id, b); }
}
