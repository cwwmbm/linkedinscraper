import { Command, CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';

@Command({
  name: 'retry-failed',
  description: 'Retry fetching failed job descriptions',
})
export class RetryFailedCommand extends CommandRunner {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async run(): Promise<void> {
    console.log('🔁 Starting retry-failed operation...');

    try {
      const job = await this.queueService.addRetryFailedJob();
      console.log(`✅ Retry-failed job queued successfully (Job ID: ${job.id})`);
      console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
      console.log('\n💡 The retry-failed job is running in the background.');
      console.log('   Start the API server to process the job: npm run start:dev');
    } catch (error) {
      console.error('❌ Error queuing retry-failed job:', error.message);
      throw error;
    }
  }
}
