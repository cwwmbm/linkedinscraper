import { Command, CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';

@Command({
  name: 'backup',
  description: 'Backup the database',
})
export class BackupCommand extends CommandRunner {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async run(): Promise<void> {
    console.log('💾 Starting database backup...');

    try {
      const job = await this.queueService.addBackupJob();
      console.log(`✅ Backup job queued successfully (Job ID: ${job.id})`);
      console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
      console.log('\n💡 The backup job is running in the background.');
      console.log('   Start the API server to process the job: npm run start:dev');
      console.log('   Backup files will be saved to: data/');
    } catch (error) {
      console.error('❌ Error queuing backup job:', error.message);
      throw error;
    }
  }
}
