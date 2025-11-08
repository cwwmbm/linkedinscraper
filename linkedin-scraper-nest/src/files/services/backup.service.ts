import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly dbPath: string;

  constructor(private readonly configService: ConfigService) {
    this.backupDir = path.join(process.cwd(), 'data');
    this.dbPath = this.configService.get('DB_PATH', path.join(process.cwd(), 'data', 'my_database.db'));
  }

  async backupDatabase(): Promise<string> {
    this.logger.log('Starting database backup...');

    try {
      // Check if database file exists
      await fs.access(this.dbPath);

      // Generate backup filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '')
        .replace('T', '_')
        .split('.')[0];
      const backupFilename = `my_database.db.backup_${timestamp}`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Copy database file
      await fs.copyFile(this.dbPath, backupPath);

      this.logger.log(`Database backup completed: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.error(`Database backup failed: ${error.message}`);
      throw new Error(`Failed to backup database: ${error.message}`);
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(file => file.startsWith('my_database.db.backup_'))
        .sort()
        .reverse(); // Most recent first

      return backups.map(file => path.join(this.backupDir, file));
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  async deleteOldBackups(keepCount: number = 10): Promise<number> {
    this.logger.log(`Cleaning up old backups, keeping ${keepCount} most recent...`);

    const backups = await this.listBackups();

    if (backups.length <= keepCount) {
      this.logger.log('No old backups to delete');
      return 0;
    }

    const backupsToDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backupPath of backupsToDelete) {
      try {
        await fs.unlink(backupPath);
        deletedCount++;
        this.logger.log(`Deleted old backup: ${path.basename(backupPath)}`);
      } catch (error) {
        this.logger.error(`Failed to delete backup ${backupPath}: ${error.message}`);
      }
    }

    this.logger.log(`Cleanup completed: ${deletedCount} backups deleted`);
    return deletedCount;
  }
}
