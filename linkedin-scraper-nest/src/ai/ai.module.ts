import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { Job } from '../jobs/entities/job.entity';
import { OpenrouterService } from './services/openrouter.service';
import { PdfReaderService } from './services/pdf-reader.service';
import { JobAnalyzerService } from './services/job-analyzer.service';
import { CoverLetterService } from './services/cover-letter.service';
import { ResumeTailorService } from './services/resume-tailor.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([Job]),
  ],
  providers: [OpenrouterService, PdfReaderService, JobAnalyzerService, CoverLetterService, ResumeTailorService],
  exports: [OpenrouterService, PdfReaderService, JobAnalyzerService, CoverLetterService, ResumeTailorService],
})
export class AiModule {}
