import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { FilteredJob } from './entities/filtered-job.entity';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ManualJobCreatorService } from './services/manual-job-creator.service';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, FilteredJob]),
    AiModule,
    QueueModule,
    FilesModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, ManualJobCreatorService],
  exports: [JobsService],
})
export class JobsModule {}
