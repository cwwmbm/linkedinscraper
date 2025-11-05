import { ConfigService } from '@nestjs/config';
export declare class PdfReaderService {
    private readonly configService;
    constructor(configService: ConfigService);
    readResume(): Promise<string>;
    readPdf(filePath: string): Promise<string>;
}
