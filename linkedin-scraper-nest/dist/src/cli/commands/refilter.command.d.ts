import { CommandRunner } from 'nest-commander';
import { QueueService } from '../../queue/queue.service';
export declare class RefilterCommand extends CommandRunner {
    private readonly queueService;
    constructor(queueService: QueueService);
    run(): Promise<void>;
}
