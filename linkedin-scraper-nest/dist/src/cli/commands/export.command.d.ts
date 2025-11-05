import { CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';
interface ExportOptions {
    format?: string;
    filter?: string;
}
export declare class ExportCommand extends CommandRunner {
    private readonly queueService;
    constructor(queueService: QueueService);
    run(_passedParams: string[], options: ExportOptions): Promise<void>;
    parseFormat(val: string): string;
    parseFilter(val: string): string;
}
export {};
