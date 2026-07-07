import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip WebSocket connections from rate limiting to prevent drops on socket communication
    if (context.getType() === 'ws') {
      return true;
    }
    return super.shouldSkip(context);
  }
}
