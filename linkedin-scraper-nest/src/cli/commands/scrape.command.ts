import { Command, CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';

@Command({
  name: 'scrape',
  description: 'Trigger full LinkedIn job scraping',
})
export class ScrapeCommand extends CommandRunner {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting full scraping operation...');

    try {
      const job = await this.queueService.addScrapeAllJob();
      console.log(`✅ Scraping job queued successfully (Job ID: ${job.id})`);
      console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
      console.log('\n💡 The scraping job is running in the background.');
      console.log('   Start the API server to process the job: npm run start:dev');
    } catch (error) {
      console.error('❌ Error queuing scrape job:', error.message);
      throw error;
    }
  }
}
