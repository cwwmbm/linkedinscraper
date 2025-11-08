import type { Job } from 'bull';
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
export declare class ExportProcessor {
    private readonly exportService;
    private readonly backupService;
    private readonly logger;
    constructor(exportService: ExportService, backupService: BackupService);
    handleExportJobs(job: Job<ExportJobData>): Promise<{
        filepath: string;
        count?: number;
    }>;
    handleBackupDatabase(job: Job<BackupJobData>): Promise<{
        backupPath: string;
    }>;
}
export {};
