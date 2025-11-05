import { Command, CommandRunner, Option } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';

interface AnalyzeOptions {
  mode?: string;
}

@Command({
  name: 'analyze',
  description: 'Trigger batch job analysis',
})
export class AnalyzeCommand extends CommandRunner {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async run(_passedParams: string[], options: AnalyzeOptions): Promise<void> {
    const mode = (options.mode || 'not-analyzed') as 'not-analyzed' | 'not-hidden' | 'all';

    console.log(`🔍 Starting batch analysis with mode: ${mode}`);

    try {
      const job = await this.queueService.addAnalyzeBatchJob(mode);
      console.log(`✅ Analysis job queued successfully (Job ID: ${job.id})`);
      console.log(`📊 Check job status: GET /scraper/jobs/${job.id}`);
      console.log('\n💡 The analysis job is running in the background.');
      console.log('   Start the API server to process the job: npm run start:dev');
    } catch (error) {
      console.error('❌ Error queuing analysis job:', error.message);
      throw error;
    }
  }

  @Option({
    flags: '-m, --mode <mode>',
    description: 'Analysis mode: not-analyzed, not-hidden, or all (default: not-analyzed)',
  })
  parseMode(val: string): string {
    const validModes = ['not-analyzed', 'not-hidden', 'all'];
    if (!validModes.includes(val)) {
      throw new Error(`Invalid mode: ${val}. Must be one of: ${validModes.join(', ')}`);
    }
    return val;
  }
}
