import { Command, CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';

@Command({
  name: 'refilter',
  description: 'Reapply filters to all visible jobs',
})
export class RefilterCommand extends CommandRunner {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async run(): Promise<void> {
    console.log('🔄 Starting refilter operation...');

    try {
      const job = await this.queueService.addRefilterJob();
      console.log(`✅ Refilter job queued successfully (Job ID: ${job.id})`);
      console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
      console.log('\n💡 The refilter job is running in the background.');
      console.log('   Start the API server to process the job: npm run start:dev');
    } catch (error) {
      console.error('❌ Error queuing refilter job:', error.message);
      throw error;
    }
  }
}
