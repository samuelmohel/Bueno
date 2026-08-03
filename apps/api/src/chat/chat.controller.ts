import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get(':bookingId')
  getMessages(@Param('bookingId') id: string, @Query('page') page?: string) {
    return this.chat.getMessages(id, Number(page) || 1);
  }

  @Post(':bookingId')
  send(@Param('bookingId') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.chat.sendMessage(id, user.id, body.content, body.attachmentUrl, body.messageType);
  }

  @Post(':bookingId/read')
  markRead(@Param('bookingId') id: string, @CurrentUser() user: any) {
    return this.chat.markRead(id, user.id);
  }
}
