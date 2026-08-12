import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { Response } from 'express';

@ApiTags('Health')
@Controller()
export class AppController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@ApiOperation({ summary: "Ping de l'API à sa racine" })
	getHello(): string {
		return 'Hello World!';
	}

	@Get('health')
	@ApiOperation({ summary: 'Sonde de santé (Healthcheck) du serveur et de la base de données' })
	@ApiResponse({ status: 200, description: 'Le service est fonctionnel et sain.' })
	@ApiResponse({ status: 503, description: 'Un ou plusieurs composants du service sont indisponibles.' })
	async getHealth(@Res() res: Response) {
		const startTime = Date.now();
		let dbStatus = 'down';
		let isHealthy = false;

		try {
			await this.prisma.$queryRaw`SELECT 1`;
			dbStatus = 'up';
			isHealthy = true;
		} catch (error) {
			dbStatus = `down: ${error?.message || error}`;
		}

		const responsePayload = {
			status: isHealthy ? 'ok' : 'error',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			responseTimeMs: Date.now() - startTime,
			checks: {
				database: dbStatus,
				memory: process.memoryUsage(),
			},
		};

		if (isHealthy) {
			return res.status(HttpStatus.OK).json(responsePayload);
		} else {
			return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(responsePayload);
		}
	}
}
