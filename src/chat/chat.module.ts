import { Module, Global } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { MetricsModule } from '@/metrics/metrics.module';

@Global()
@Module({
	imports: [JwtModule, MetricsModule],
	providers: [ChatGateway],
	exports: [ChatGateway],
})
export class ChatModule {}
