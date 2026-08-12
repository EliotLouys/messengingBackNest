import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { Response } from 'express';

describe('AppController', () => {
	let appController: AppController;
	let prismaService: PrismaService;

	const mockPrismaService = {
		$queryRaw: jest.fn(),
	};

	const mockResponse = () => {
		const res: Partial<Response> = {};
		res.status = jest.fn().mockReturnValue(res);
		res.json = jest.fn().mockReturnValue(res);
		return res as Response;
	};

	beforeEach(async () => {
		const app: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [
				{
					provide: PrismaService,
					useValue: mockPrismaService,
				},
			],
		}).compile();

		appController = app.get<AppController>(AppController);
		prismaService = app.get<PrismaService>(PrismaService);
	});

	describe('root', () => {
		it('should return "Hello World!"', () => {
			expect(appController.getHello()).toBe('Hello World!');
		});
	});

	describe('health', () => {
		it('should return status ok and 200 when database is healthy', async () => {
			mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
			const res = mockResponse();

			await appController.getHealth(res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'ok',
					checks: expect.objectContaining({
						database: 'up',
					}),
				}),
			);
		});

		it('should return status error and 503 when database is down', async () => {
			mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
			const res = mockResponse();

			await appController.getHealth(res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					checks: expect.objectContaining({
						database: expect.stringContaining('down'),
					}),
				}),
			);
		});
	});
});
