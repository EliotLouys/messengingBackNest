import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { tap } from 'rxjs';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
	constructor(
		@InjectMetric('http_request_duration_seconds')
		private readonly histogram: Histogram<string>,
	) {}

	intercept(ctx: ExecutionContext, next: CallHandler) {
		if (ctx.getType() !== 'http') return next.handle();

		const req = ctx.switchToHttp().getRequest();
		const res = ctx.switchToHttp().getResponse();
		const stop = this.histogram.startTimer();

		const record = (status: number) =>
			stop({
				method: req.method,
				route: req.route?.path ?? 'unmatched',
				status,
			});

		return next.handle().pipe(
			tap({
				next: () => record(res.statusCode as number),
				error: (e) => record((e?.status as number) ?? 500),
			}),
		);
	}
}
