import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type { Queue } from 'bull';
export declare class RedisHealthIndicator extends HealthIndicator {
    private scraperQueue;
    constructor(scraperQueue: Queue);
    isHealthy(key: string): Promise<HealthIndicatorResult>;
}
