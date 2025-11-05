import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue('scraper') private scraperQueue: Queue,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Try to get queue information, which requires Redis connection
      const client = await this.scraperQueue.client;

      // Ping Redis to verify connection
      const pong = await client.ping();

      const isHealthy = pong === 'PONG';

      const result = this.getStatus(key, isHealthy, {
        message: 'Redis is connected and responding',
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Redis health check failed', result);
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: `Redis connection failed: ${error.message}`,
      });
      throw new HealthCheckError('Redis health check failed', result);
    }
  }
}
