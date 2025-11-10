import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { Job } from '../jobs/entities/job.entity';
import { ExportService } from './services/export.service';
import { BackupService } from './services/backup.service';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    ConfigModule,
  ],
  providers: [ExportService, BackupService, PdfGeneratorService],
  exports: [ExportService, BackupService, PdfGeneratorService],
})
export class FilesModule {}
