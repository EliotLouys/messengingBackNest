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

	// Standard validation pipe to validate incoming requests
	app.useGlobalPipes(new ValidationPipe());

	// Swagger configuration
	const config = new DocumentBuilder()
		.setTitle('Messaging API')
		.setDescription('API de messagerie maison')
		.setVersion('1.0')
		.addBearerAuth()
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('swagger', app, document);

	// Media uploads directory configuration
	const uploadDir = join(process.cwd(), process.env.MEDIA_DIR || 'files');
	if (!existsSync(uploadDir)) {
		mkdirSync(uploadDir);
	}

	app.use('/uploads', express.static(join(process.cwd(), 'files')));
	app.use(json({ limit: '50mb' }));
	app.use(urlencoded({ extended: true, limit: '50mb' }));

	// Final bootstrapping
	const port = process.env.PORT || 3000;
	console.log(`Running on port : ${port}`);
	console.log(`Database URL at runtime: ${process.env.DATABASE_URL}`);
	app.enableCors();
	await app.listen(port);
}
bootstrap();
