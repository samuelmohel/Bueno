import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifs: NotificationsService) {}

  @Get()
  getAll(@CurrentUser() user: any, @Query('page') page?: string) {
    return this.notifs.getUserNotifications(user.id, Number(page) || 1);
  }

  @Patch('read')
  markAllRead(@CurrentUser() user: any) {
    return this.notifs.markRead(user.id);
  }

  @Patch(':id/read')
  markOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notifs.markRead(user.id, id);
  }
}
