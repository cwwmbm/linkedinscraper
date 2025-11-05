import { HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
export declare class HealthController {
    private health;
    private db;
    private memory;
    private disk;
    private redis;
    constructor(health: HealthCheckService, db: TypeOrmHealthIndicator, memory: MemoryHealthIndicator, disk: DiskHealthIndicator, redis: RedisHealthIndicator);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
