import { Module, Global } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule], // Nécessaire pour vérifier le token
  providers: [ChatGateway],
  exports: [ChatGateway], // On exporte la Gateway pour l'utiliser ailleurs
})
export class ChatModule {}
