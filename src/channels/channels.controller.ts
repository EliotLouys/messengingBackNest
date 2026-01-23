import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { ChannelDto, MessageDto, ThemeDto } from '../common/dto/channel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/express';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('protected/channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @ApiOperation({ summary: 'Lister tous les channels' })
  @Get()
  findChannels(@Req() req: RequestWithUser) {
    return this.channelsService.findChannels(req.user.id);
  }

  @ApiOperation({ summary: "Détails d'un channel" })
  @Get(':channel_id')
  findOne(@Param('channel_id', ParseIntPipe) channelId: number) {
    return this.channelsService.findOne(channelId);
  }

  @ApiOperation({ summary: 'Créer un nouveau channel' })
  @ApiResponse({ status: 201, description: 'Channel créé avec succès.' })
  @ApiResponse({ status: 409, description: 'Nom déjà pris.' })
  @Post()
  create(@Body() dto: ChannelDto, @Req() req: RequestWithUser) {
    return this.channelsService.create(dto, req.user.id);
  }

  @ApiOperation({ summary: 'Supprimer un channel' })
  @Delete(':channel_id')
  deleteChannel(@Param('channel_id', ParseIntPipe) channelId: number) {
    return this.channelsService.delete(channelId);
  }

  @ApiOperation({ summary: 'Mettre à jour le thème' })
  @Put(':channel_id/update_metadata')
  updateMetadata(
    @Body() dto: ThemeDto,
    @Param('channel_id', ParseIntPipe) channelId: number,
  ) {
    return this.channelsService.updateMetadata(dto, channelId);
  }

  @ApiOperation({ summary: 'Rejoindre un channel (via URL)' })
  @Put(':channel_id/user/:user_id')
  joinChannel(
    @Param('channel_id', ParseIntPipe) channelId: number,
    @Param('user_id', ParseIntPipe) userId: number,
  ) {
    return this.channelsService.putInChannel(channelId, userId);
  }

  @ApiOperation({ summary: "Retirer un user d'un channel" })
  @Delete(':channel_id/user/:user_id')
  leaveChannel(
    @Param('channel_id', ParseIntPipe) channelId: number,
    @Param('user_id', ParseIntPipe) userId: number,
  ) {
    return this.channelsService.removeFromChannel(channelId, userId);
  }

  @ApiOperation({ summary: 'Poster un message' })
  @Post(':channel_id/messages')
  sendMessage(
    @Body() dto: MessageDto,
    @Param('channel_id', ParseIntPipe) channelId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.channelsService.sendMessage(dto, channelId, req.user.id);
  }

  @ApiOperation({ summary: "Récupérer l'historique des messages" })
  @Get(':channel_id/messages')
  getMessages(@Param('channel_id', ParseIntPipe) channelId: number) {
    return this.channelsService.getMessages(channelId);
  }
}
