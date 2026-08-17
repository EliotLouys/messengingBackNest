import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MetricsGuard implements CanActivate {
	constructor(private config: ConfigService) {}

	canActivate(ctx: ExecutionContext): boolean {
		const req = ctx.switchToHttp().getRequest();
		if (!req.path.startsWith('/metrics')) return true;
		return req.headers.authorization === `Bearer ${this.config.get('METRICS_TOKEN')}`;
	}
}
