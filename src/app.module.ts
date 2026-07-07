import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelsModule } from './channels/channels.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => [
				{
					ttl: config.get<number>('THROTTLE_TTL', 60000),
					limit: config.get<number>('THROTTLE_LIMIT', 100),
				},
			],
		}),
		PrismaModule,
		ChannelsModule,
		AuthModule,
		UsersModule,
		ChatModule,
		UploadsModule,
		NotificationsModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: AppThrottlerGuard,
		},
	],
})
export class AppModule {}
