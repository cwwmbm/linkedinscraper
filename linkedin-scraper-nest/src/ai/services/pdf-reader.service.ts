import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfReaderService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Read and extract text from the configured resume PDF
   * @returns Extracted text from the PDF
   */
  async readResume(): Promise<string> {
    const resumePath = this.configService.get<string>('files.resumePath');

    if (!resumePath) {
      throw new NotFoundException('Resume path is not configured');
    }

    return this.readPdf(resumePath);
  }

  /**
   * Read and extract text from a PDF file
   * @param filePath Path to the PDF file
   * @returns Extracted text from the PDF
   */
  async readPdf(filePath: string): Promise<string> {
    try {
      // Resolve path relative to project root
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), '..', filePath);

      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        throw new NotFoundException(`PDF file not found: ${filePath}`);
      }

      // Read the PDF file
      const dataBuffer = fs.readFileSync(absolutePath);

      // Extract text from PDF
      const data = await pdfParse(dataBuffer);

      return data.text;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error reading PDF file '${filePath}':`, error.message);
      throw new Error(`Failed to read PDF: ${error.message}`);
    }
  }
}
