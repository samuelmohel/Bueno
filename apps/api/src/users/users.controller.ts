import { Controller, Get, Post, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  createUser(@Body() b: any) { return this.users.createUser(b); }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Get()
  findAll(@Query('page') p?: string, @Query('limit') l?: string, @Query('role') role?: string) {
    return this.users.findAll(Number(p) || 1, Number(l) || 20, role);
  }

  @Roles(UserRole.ADMIN, UserRole.HEAD_OF_OPERATIONS)
  @Get('stats')
  getStats() { return this.users.getStats(); }

  @Get('me')
  getMe(@CurrentUser() u: any) { return this.users.findById(u.id); }

  @Patch('me')
  updateMe(@CurrentUser() u: any, @Body() b: any) { return this.users.updateProfile(u.id, b); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.users.findById(id); }
}

