import { Test, TestingModule } from '@nestjs/testing';
import { getToken } from '@willsoto/nestjs-prometheus';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

describe('HttpMetricsInterceptor', () => {
	let interceptor: HttpMetricsInterceptor;

	const stop = jest.fn();
	const mockHistogram = {
		startTimer: jest.fn(() => stop),
	};

	const mockContext = (
		type = 'http',
		req: any = { method: 'GET', route: { path: '/channels/:id' } },
		res: any = { statusCode: 200 },
	) =>
		({
			getType: () => type,
			switchToHttp: () => ({
				getRequest: () => req,
				getResponse: () => res,
			}),
		}) as unknown as ExecutionContext;

	const mockHandler = (handle: () => any): CallHandler => ({ handle });

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				HttpMetricsInterceptor,
				{ provide: getToken('http_request_duration_seconds'), useValue: mockHistogram },
			],
		}).compile();

		interceptor = module.get<HttpMetricsInterceptor>(HttpMetricsInterceptor);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(interceptor).toBeDefined();
	});

	it('should not start a timer for non-http contexts', async () => {
		const result = await lastValueFrom(
			interceptor.intercept(
				mockContext('ws'),
				mockHandler(() => of('ok')),
			),
		);

		expect(result).toBe('ok');
		expect(mockHistogram.startTimer).not.toHaveBeenCalled();
	});

	it('should record the request duration with method, route and status', async () => {
		await lastValueFrom(
			interceptor.intercept(
				mockContext(),
				mockHandler(() => of('ok')),
			),
		);

		expect(mockHistogram.startTimer).toHaveBeenCalledTimes(1);
		expect(stop).toHaveBeenCalledWith({
			method: 'GET',
			route: '/channels/:id',
			status: 200,
		});
	});

	it('should label the route as unmatched when there is no route', async () => {
		const ctx = mockContext('http', { method: 'POST' }, { statusCode: 404 });

		await lastValueFrom(
			interceptor.intercept(
				ctx,
				mockHandler(() => of('ok')),
			),
		);

		expect(stop).toHaveBeenCalledWith({
			method: 'POST',
			route: 'unmatched',
			status: 404,
		});
	});

	it('should record the status carried by a thrown error', async () => {
		const error = Object.assign(new Error('nope'), { status: 403 });

		await expect(
			lastValueFrom(
				interceptor.intercept(
					mockContext(),
					mockHandler(() => throwError(() => error)),
				),
			),
		).rejects.toThrow('nope');

		expect(stop).toHaveBeenCalledWith({
			method: 'GET',
			route: '/channels/:id',
			status: 403,
		});
	});

	it('should default to status 500 for errors without a status', async () => {
		await expect(
			lastValueFrom(
				interceptor.intercept(
					mockContext(),
					mockHandler(() => throwError(() => new Error('boom'))),
				),
			),
		).rejects.toThrow('boom');

		expect(stop).toHaveBeenCalledWith({
			method: 'GET',
			route: '/channels/:id',
			status: 500,
		});
	});
});
