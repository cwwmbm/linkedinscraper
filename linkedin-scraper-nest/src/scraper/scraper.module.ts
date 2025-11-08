import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { Job } from '../jobs/entities/job.entity';
import { FilteredJob } from '../jobs/entities/filtered-job.entity';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { JobFilterService } from './services/job-filter.service';
import { UrlBuilderService } from './services/url-builder.service';
import { LinkedInScraperService } from './services/linkedin-scraper.service';
import { PageParserService } from './services/page-parser.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    AiModule,
    TypeOrmModule.forFeature([Job, FilteredJob]),
    forwardRef(() => QueueModule),
  ],
  providers: [
    ScraperService,
    JobFilterService,
    UrlBuilderService,
    LinkedInScraperService,
    PageParserService,
  ],
  controllers: [ScraperController],
  exports: [
    ScraperService,
    JobFilterService,
    UrlBuilderService,
    LinkedInScraperService,
    PageParserService,
  ],
})
export class ScraperModule {}
