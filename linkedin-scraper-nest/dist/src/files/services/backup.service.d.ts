import { ConfigService } from '@nestjs/config';
export declare class BackupService {
    private readonly configService;
    private readonly logger;
    private readonly backupDir;
    private readonly dbPath;
    constructor(configService: ConfigService);
    backupDatabase(): Promise<string>;
    listBackups(): Promise<string[]>;
    deleteOldBackups(keepCount?: number): Promise<number>;
}
