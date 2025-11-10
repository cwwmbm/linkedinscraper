import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  /**
   * Generate a PDF resume for a specific job
   */
  async generateResumePdf(jobId: number): Promise<Buffer> {
    this.logger.log(`Generating PDF resume for job ${jobId}`);

    // Fetch job with resume
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.resume) {
      throw new NotFoundException(
        `No resume found for job ${jobId}. Generate a resume first.`,
      );
    }

    // Create HTML from resume text
    const html = this.createResumeHtml(job);

    // Generate PDF using Puppeteer
    const pdf = await this.htmlToPdf(html);

    this.logger.log(`Successfully generated PDF resume for job ${jobId}`);
    return pdf;
  }

  /**
   * Generate a PDF cover letter for a specific job
   */
  async generateCoverLetterPdf(jobId: number): Promise<Buffer> {
    this.logger.log(`Generating PDF cover letter for job ${jobId}`);

    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.cover_letter) {
      throw new NotFoundException(
        `No cover letter found for job ${jobId}. Generate a cover letter first.`,
      );
    }

    const html = this.createCoverLetterHtml(job);
    const pdf = await this.htmlToPdf(html);

    this.logger.log(`Successfully generated PDF cover letter for job ${jobId}`);
    return pdf;
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPdf(html: string): Promise<Buffer> {
    let browser;

    try {
      // Launch browser with chromium
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error('Error generating PDF', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Create HTML template for resume
   */
  private createResumeHtml(job: Job): string {
    // Convert markdown-style text to basic HTML
    const resumeHtml = this.markdownToHtml(job.resume);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${job.title} at ${job.company}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }

    .header h1 {
      color: #2c3e50;
      font-size: 28px;
      margin-bottom: 8px;
    }

    .job-info {
      color: #555;
      font-size: 14px;
      font-style: italic;
    }

    .job-info strong {
      color: #2c3e50;
    }

    .content {
      font-size: 11pt;
      line-height: 1.8;
    }

    .content h1, .content h2 {
      color: #2c3e50;
      margin-top: 20px;
      margin-bottom: 10px;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 5px;
    }

    .content h1 {
      font-size: 20px;
    }

    .content h2 {
      font-size: 18px;
    }

    .content h3 {
      color: #34495e;
      font-size: 16px;
      margin-top: 15px;
      margin-bottom: 8px;
    }

    .content p {
      margin-bottom: 12px;
    }

    .content ul, .content ol {
      margin-left: 25px;
      margin-bottom: 12px;
    }

    .content li {
      margin-bottom: 6px;
    }

    .content strong {
      color: #2c3e50;
    }

    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #ecf0f1;
      text-align: center;
      color: #95a5a6;
      font-size: 10px;
    }

    /* Print optimization */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tailored Resume</h1>
      <div class="job-info">
        <strong>Position:</strong> ${this.escapeHtml(job.title)} at ${this.escapeHtml(job.company)}
        ${job.location ? `<br><strong>Location:</strong> ${this.escapeHtml(job.location)}` : ''}
      </div>
    </div>

    <div class="content">
      ${resumeHtml}
    </div>

    <div class="footer">
      Generated on ${new Date().toLocaleDateString()} | Tailored for ${this.escapeHtml(job.title)}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create HTML template for cover letter
   */
  private createCoverLetterHtml(job: Job): string {
    const coverLetterHtml = this.markdownToHtml(job.cover_letter);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cover Letter - ${job.title} at ${job.company}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Georgia', serif;
      line-height: 1.8;
      color: #333;
      background: #fff;
    }

    .container {
      max-width: 750px;
      margin: 0 auto;
      padding: 40px;
    }

    .header {
      text-align: right;
      margin-bottom: 40px;
      color: #555;
      font-size: 12px;
    }

    .company-info {
      margin-bottom: 40px;
    }

    .company-info p {
      margin-bottom: 5px;
    }

    .greeting {
      margin-bottom: 20px;
      font-weight: 600;
    }

    .content {
      font-size: 11pt;
      line-height: 1.8;
      text-align: justify;
    }

    .content p {
      margin-bottom: 16px;
      text-indent: 0;
    }

    .closing {
      margin-top: 40px;
    }

    .closing p {
      margin-bottom: 8px;
    }

    .signature {
      margin-top: 50px;
      font-style: italic;
    }

    .footer {
      margin-top: 60px;
      padding-top: 15px;
      border-top: 1px solid #ecf0f1;
      text-align: center;
      color: #95a5a6;
      font-size: 10px;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>

    <div class="company-info">
      <p><strong>${this.escapeHtml(job.company)}</strong></p>
      ${job.location ? `<p>${this.escapeHtml(job.location)}</p>` : ''}
    </div>

    <div class="greeting">
      Dear Hiring Manager,
    </div>

    <div class="content">
      ${coverLetterHtml}
    </div>

    <div class="closing">
      <p>Sincerely,</p>
      <div class="signature">[Your Name]</div>
    </div>

    <div class="footer">
      Cover Letter for ${this.escapeHtml(job.title)} position at ${this.escapeHtml(job.company)}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Convert basic markdown to HTML
   */
  private markdownToHtml(text: string): string {
    if (!text) return '';

    let html = text;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Unordered lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => {
      return '<ul>' + match + '</ul>';
    });

    // Ordered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

    // Paragraphs (double newline = new paragraph)
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>\s*<\/p>/g, '');

    // Clean up paragraphs around other block elements
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ol>)/g, '$1');
    html = html.replace(/(<\/ol>)<\/p>/g, '$1');

    // Single newlines to <br>
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    if (!text) return '';

    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
