import { CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';
interface AnalyzeOptions {
    mode?: string;
}
export declare class AnalyzeCommand extends CommandRunner {
    private readonly queueService;
    constructor(queueService: QueueService);
    run(_passedParams: string[], options: AnalyzeOptions): Promise<void>;
    parseMode(val: string): string;
}
export {};
