import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ConfigModule } from '../config/config.module';
import { QueueModule } from '../queue/queue.module';
import { ScraperModule } from '../scraper/scraper.module';
import { JobsModule } from '../jobs/jobs.module';
import { AiModule } from '../ai/ai.module';
import { ScrapeCommand } from './commands/scrape.command';
import { AnalyzeCommand } from './commands/analyze.command';
import { RefilterCommand } from './commands/refilter.command';
import { RetryFailedCommand } from './commands/retry-failed.command';
import { ScrapeSingleCommand } from './commands/scrape-single.command';
import { ExportCommand } from './commands/export.command';
import { BackupCommand } from './commands/backup.command';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    QueueModule,
    ScraperModule,
    JobsModule,
    AiModule,
  ],
  providers: [
    ScrapeCommand,
    AnalyzeCommand,
    RefilterCommand,
    RetryFailedCommand,
    ScrapeSingleCommand,
    ExportCommand,
    BackupCommand,
  ],
})
export class CliModule {}
