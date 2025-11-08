import { Command, CommandRunner, Option } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';

interface ScrapeSingleOptions {
  url: string;
}

@Command({
  name: 'scrape-single',
  description: 'Scrape a single job page using AI',
})
export class ScrapeSingleCommand extends CommandRunner {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async run(_passedParams: string[], options: ScrapeSingleOptions): Promise<void> {
    const { url } = options;

    if (!url) {
      console.error('❌ Error: URL is required');
      console.log('Usage: npm run cli scrape-single -- --url <job-url>');
      throw new Error('URL is required');
    }

    console.log(`🔗 Scraping single job page: ${url}`);

    try {
      const job = await this.queueService.addScrapeSingleJob(url);
      console.log(`✅ Single page scraping job queued successfully (Job ID: ${job.id})`);
      console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
      console.log('\n💡 The scraping job is running in the background.');
      console.log('   Start the API server to process the job: npm run start:dev');
    } catch (error) {
      console.error('❌ Error queuing scrape-single job:', error.message);
      throw error;
    }
  }

  @Option({
    flags: '-u, --url <url>',
    description: 'LinkedIn job URL to scrape',
    required: true,
  })
  parseUrl(val: string): string {
    if (!val.includes('linkedin.com/jobs')) {
      throw new Error('URL must be a LinkedIn job posting');
    }
    return val;
  }
}
