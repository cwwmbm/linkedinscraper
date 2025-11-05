import { CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';
interface ScrapeSingleOptions {
    url: string;
}
export declare class ScrapeSingleCommand extends CommandRunner {
    private readonly queueService;
    constructor(queueService: QueueService);
    run(_passedParams: string[], options: ScrapeSingleOptions): Promise<void>;
    parseUrl(val: string): string;
}
export {};
