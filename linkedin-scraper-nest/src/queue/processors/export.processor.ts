import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ExportService } from '../../files/services/export.service';
import { BackupService } from '../../files/services/backup.service';

interface ExportJobData {
  format: 'csv' | 'json';
  filter: 'all' | 'visible' | 'hidden';
  timestamp: string;
}

interface BackupJobData {
  timestamp: string;
}

@Processor('export')
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly exportService: ExportService,
    private readonly backupService: BackupService,
  ) {}

  @Process('export-jobs')
  async handleExportJobs(job: Job<ExportJobData>): Promise<{ filepath: string; count?: number }> {
    this.logger.log(`[Job ${job.id}] Starting export operation: ${job.data.format} (filter: ${job.data.filter})`);

    await job.progress(20);

    let filepath: string;
    if (job.data.format === 'csv') {
      filepath = await this.exportService.exportToCsv(job.data.filter);
    } else {
      filepath = await this.exportService.exportToJson(job.data.filter);
    }

    await job.progress(100);

    this.logger.log(`[Job ${job.id}] Export completed: ${filepath}`);
    return { filepath };
  }

  @Process('backup-db')
  async handleBackupDatabase(job: Job<BackupJobData>): Promise<{ backupPath: string }> {
    this.logger.log(`[Job ${job.id}] Starting database backup`);

    await job.progress(30);

    const backupPath = await this.backupService.backupDatabase();

    await job.progress(80);

    // Clean up old backups (keep last 10)
    await this.backupService.deleteOldBackups(10);

    await job.progress(100);

    this.logger.log(`[Job ${job.id}] Backup completed: ${backupPath}`);
    return { backupPath };
  }
}
