import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { Job } from '../jobs/entities/job.entity';
import { ExportService } from './services/export.service';
import { BackupService } from './services/backup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    ConfigModule,
  ],
  providers: [ExportService, BackupService],
  exports: [ExportService, BackupService],
})
export class FilesModule {}
