import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
	controllers: [ChannelsController],
	providers: [ChannelsService],
	imports: [NotificationsModule],
})
export class ChannelsModule {}
