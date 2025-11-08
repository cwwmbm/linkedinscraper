import { Command, CommandRunner, Option } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';

interface ExportOptions {
  format?: string;
  filter?: string;
}

@Command({
  name: 'export',
  description: 'Export jobs to CSV or JSON',
})
export class ExportCommand extends CommandRunner {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async run(_passedParams: string[], options: ExportOptions): Promise<void> {
    const format = (options.format || 'csv') as 'csv' | 'json';
    const filter = (options.filter || 'all') as 'all' | 'visible' | 'hidden';

    console.log(`📤 Starting export operation...`);
    console.log(`   Format: ${format.toUpperCase()}`);
    console.log(`   Filter: ${filter}`);

    try {
      const job = await this.queueService.addExportJob(format, filter);
      console.log(`✅ Export job queued successfully (Job ID: ${job.id})`);
      console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
      console.log('\n💡 The export job is running in the background.');
      console.log('   Start the API server to process the job: npm run start:dev');
      console.log('   Exported files will be saved to: data/exports/');
    } catch (error) {
      console.error('❌ Error queuing export job:', error.message);
      throw error;
    }
  }

  @Option({
    flags: '-f, --format <format>',
    description: 'Export format: csv or json (default: csv)',
  })
  parseFormat(val: string): string {
    const validFormats = ['csv', 'json'];
    if (!validFormats.includes(val)) {
      throw new Error(`Invalid format: ${val}. Must be one of: ${validFormats.join(', ')}`);
    }
    return val;
  }

  @Option({
    flags: '--filter <filter>',
    description: 'Filter: all, visible, or hidden (default: all)',
  })
  parseFilter(val: string): string {
    const validFilters = ['all', 'visible', 'hidden'];
    if (!validFilters.includes(val)) {
      throw new Error(`Invalid filter: ${val}. Must be one of: ${validFilters.join(', ')}`);
    }
    return val;
  }
}
