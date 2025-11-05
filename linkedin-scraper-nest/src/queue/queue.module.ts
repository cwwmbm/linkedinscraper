import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { ScraperProcessor } from './processors/scraper.processor';
import { AnalysisProcessor } from './processors/analysis.processor';
import { ExportProcessor } from './processors/export.processor';
import { ScraperModule } from '../scraper/scraper.module';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { Job } from '../jobs/entities/job.entity';

@Module({
  imports: [
    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 200, // Keep last 200 failed jobs
          attempts: 3, // Retry failed jobs 3 times
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 second delay
          },
        },
      }),
      inject: [ConfigService],
    }),
    // Register the queues
    BullModule.registerQueue(
      { name: 'scraper' },
      { name: 'analysis' },
      { name: 'export' },
    ),
    // Import Job entity for AnalysisProcessor
    TypeOrmModule.forFeature([Job]),
    // Import ScraperModule to make ScraperService available to processor
    forwardRef(() => ScraperModule),
    // Import AiModule to make JobAnalyzerService available to processor
    forwardRef(() => AiModule),
    // Import FilesModule for export and backup services
    FilesModule,
  ],
  providers: [QueueService, ScraperProcessor, AnalysisProcessor, ExportProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
