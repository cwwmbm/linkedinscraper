import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly exportDir = path.join(process.cwd(), 'data', 'exports');

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  async exportToCsv(filter: 'all' | 'visible' | 'hidden' = 'all'): Promise<string> {
    this.logger.log(`Starting CSV export with filter: ${filter}`);

    // Ensure export directory exists
    await fs.mkdir(this.exportDir, { recursive: true });

    // Fetch jobs based on filter
    let jobs: Job[];
    switch (filter) {
      case 'visible':
        jobs = await this.jobsRepository.find({ where: { hidden: 0 }, order: { id: 'ASC' } });
        break;
      case 'hidden':
        jobs = await this.jobsRepository.find({ where: { hidden: 1 }, order: { id: 'ASC' } });
        break;
      default:
        jobs = await this.jobsRepository.find({ order: { id: 'ASC' } });
    }

    this.logger.log(`Found ${jobs.length} jobs to export`);

    // Generate CSV content
    const headers = [
      'id',
      'title',
      'company',
      'location',
      'date',
      'job_url',
      'job_description',
      'applied',
      'hidden',
      'interview',
      'rejected',
      'blocked',
      'date_loaded',
      'cover_letter',
      'resume',
      'metadata',
      'notes',
    ];

    const csvRows = [headers.join(',')];

    for (const job of jobs) {
      const row = [
        job.id,
        this.escapeCsvField(job.title),
        this.escapeCsvField(job.company),
        this.escapeCsvField(job.location),
        this.escapeCsvField(job.date),
        this.escapeCsvField(job.job_url),
        this.escapeCsvField(job.job_description),
        job.applied,
        job.hidden,
        job.interview,
        job.rejected,
        job.blocked,
        this.escapeCsvField(job.date_loaded),
        this.escapeCsvField(job.cover_letter),
        this.escapeCsvField(job.resume),
        this.escapeCsvField(job.metadata),
        this.escapeCsvField(job.notes),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `jobs_export_${filter}_${timestamp}_${Date.now()}.csv`;
    const filepath = path.join(this.exportDir, filename);

    await fs.writeFile(filepath, csvContent, 'utf-8');

    this.logger.log(`CSV export completed: ${filepath}`);
    return filepath;
  }

  async exportToJson(filter: 'all' | 'visible' | 'hidden' = 'all'): Promise<string> {
    this.logger.log(`Starting JSON export with filter: ${filter}`);

    // Ensure export directory exists
    await fs.mkdir(this.exportDir, { recursive: true });

    // Fetch jobs based on filter
    let jobs: Job[];
    switch (filter) {
      case 'visible':
        jobs = await this.jobsRepository.find({ where: { hidden: 0 }, order: { id: 'ASC' } });
        break;
      case 'hidden':
        jobs = await this.jobsRepository.find({ where: { hidden: 1 }, order: { id: 'ASC' } });
        break;
      default:
        jobs = await this.jobsRepository.find({ order: { id: 'ASC' } });
    }

    this.logger.log(`Found ${jobs.length} jobs to export`);

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `jobs_export_${filter}_${timestamp}_${Date.now()}.json`;
    const filepath = path.join(this.exportDir, filename);

    await fs.writeFile(filepath, JSON.stringify(jobs, null, 2), 'utf-8');

    this.logger.log(`JSON export completed: ${filepath}`);
    return filepath;
  }

  private escapeCsvField(field: string | null | undefined): string {
    if (field === null || field === undefined) {
      return '';
    }

    const stringField = String(field);

    // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }

    return stringField;
  }
}
