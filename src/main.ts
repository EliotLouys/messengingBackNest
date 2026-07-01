import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';
import { json, urlencoded } from 'express';

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

	const uploadDir = join(process.cwd(), 'files');
	if (!existsSync(uploadDir)) {
		mkdirSync(uploadDir);
	}

	app.use('/uploads', express.static(join(process.cwd(), 'files')));
	app.use(json({ limit: '50mb' }));
	app.use(urlencoded({ extended: true, limit: '50mb' }));

	console.log('Running on port : 3000');
	app.enableCors();
	await app.listen(3000);
}
bootstrap();

// Yes i test
// test
