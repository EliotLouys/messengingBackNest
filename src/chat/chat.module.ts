import { Module, Global } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
	imports: [JwtModule],
	providers: [ChatGateway],
	exports: [ChatGateway],
})
export class ChatModule {}
