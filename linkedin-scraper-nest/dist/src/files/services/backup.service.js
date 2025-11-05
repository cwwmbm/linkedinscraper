"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BackupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
let BackupService = BackupService_1 = class BackupService {
    configService;
    logger = new common_1.Logger(BackupService_1.name);
    backupDir;
    dbPath;
    constructor(configService) {
        this.configService = configService;
        this.backupDir = path.join(process.cwd(), 'data');
        this.dbPath = this.configService.get('DB_PATH', path.join(process.cwd(), 'data', 'my_database.db'));
    }
    async backupDatabase() {
        this.logger.log('Starting database backup...');
        try {
            await fs.access(this.dbPath);
            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, '')
                .replace('T', '_')
                .split('.')[0];
            const backupFilename = `my_database.db.backup_${timestamp}`;
            const backupPath = path.join(this.backupDir, backupFilename);
            await fs.copyFile(this.dbPath, backupPath);
            this.logger.log(`Database backup completed: ${backupPath}`);
            return backupPath;
        }
        catch (error) {
            this.logger.error(`Database backup failed: ${error.message}`);
            throw new Error(`Failed to backup database: ${error.message}`);
        }
    }
    async listBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = files
                .filter(file => file.startsWith('my_database.db.backup_'))
                .sort()
                .reverse();
            return backups.map(file => path.join(this.backupDir, file));
        }
        catch (error) {
            this.logger.error(`Failed to list backups: ${error.message}`);
            return [];
        }
    }
    async deleteOldBackups(keepCount = 10) {
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
            }
            catch (error) {
                this.logger.error(`Failed to delete backup ${backupPath}: ${error.message}`);
            }
        }
        this.logger.log(`Cleanup completed: ${deletedCount} backups deleted`);
        return deletedCount;
    }
};
exports.BackupService = BackupService;
exports.BackupService = BackupService = BackupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BackupService);
//# sourceMappingURL=backup.service.js.map