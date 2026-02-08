import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Validation Pipe (Standard)
  app.useGlobalPipes(new ValidationPipe());

  // 2. Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Messaging API')
    .setDescription('API de messagerie maison')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  console.log('Running on port : 3000');
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
