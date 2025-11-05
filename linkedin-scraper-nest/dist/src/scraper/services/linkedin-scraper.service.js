"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LinkedInScraperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInScraperService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cheerio_1 = require("cheerio");
const rxjs_1 = require("rxjs");
const job_entity_1 = require("../../jobs/entities/job.entity");
const filtered_job_entity_1 = require("../../jobs/entities/filtered-job.entity");
const job_filter_service_1 = require("./job-filter.service");
const url_builder_service_1 = require("./url-builder.service");
let LinkedInScraperService = LinkedInScraperService_1 = class LinkedInScraperService {
    httpService;
    configService;
    filterService;
    urlBuilder;
    jobsRepository;
    filteredJobsRepository;
    logger = new common_1.Logger(LinkedInScraperService_1.name);
    constructor(httpService, configService, filterService, urlBuilder, jobsRepository, filteredJobsRepository) {
        this.httpService = httpService;
        this.configService = configService;
        this.filterService = filterService;
        this.urlBuilder = urlBuilder;
        this.jobsRepository = jobsRepository;
        this.filteredJobsRepository = filteredJobsRepository;
    }
    async scrapeJobs() {
        this.logger.log('Starting job scraping...');
        const startTime = Date.now();
        const allJobs = await this.getJobCards();
        const newJobs = await this.findNewJobs(allJobs);
        this.logger.log(`Total new jobs found after comparing to database: ${newJobs.length}`);
        if (newJobs.length === 0) {
            this.logger.log('No new jobs found');
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            this.logger.log(`Scraping finished in ${duration} seconds`);
            return { jobsAdded: 0, jobsFiltered: 0 };
        }
        const jobsWithDescriptions = await this.fetchJobDescriptions(newJobs);
        const result = await this.processAndSaveJobs(jobsWithDescriptions);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        this.logger.log(`Scraping finished in ${duration} seconds`);
        return result;
    }
    async getJobCards() {
        const allJobs = [];
        const rounds = this.urlBuilder.getRounds();
        const pagesToScrape = this.urlBuilder.getPagesToScrape();
        const queries = this.urlBuilder.getSearchQueries();
        const timespan = this.urlBuilder.getTimespan();
        for (let round = 0; round < rounds; round++) {
            for (const query of queries) {
                const queryWithTimespan = {
                    ...query,
                    f_TPR: query.f_TPR || timespan,
                };
                for (let page = 0; page < pagesToScrape; page++) {
                    const url = this.urlBuilder.buildSearchUrl(queryWithTimespan, page * 25);
                    this.logger.log(`Scraping: ${url}`);
                    try {
                        const jobs = await this.fetchAndParseSearchPage(url);
                        allJobs.push(...jobs);
                        this.logger.log(`Found ${jobs.length} jobs on this page`);
                    }
                    catch (error) {
                        this.logger.error(`Error scraping ${url}: ${error.message}`);
                    }
                    await this.sleep(1000);
                }
            }
        }
        this.logger.log(`Total job cards scraped: ${allJobs.length}`);
        const uniqueJobs = this.removeDuplicates(allJobs);
        this.logger.log(`Total job cards after removing duplicates: ${uniqueJobs.length}`);
        const filteredJobs = this.applyInitialFilters(uniqueJobs);
        this.logger.log(`Total job cards after initial filtering: ${filteredJobs.length}`);
        return filteredJobs;
    }
    async fetchAndParseSearchPage(url) {
        const html = await this.fetchWithRetry(url);
        if (!html) {
            return [];
        }
        return this.parseJobCards(html);
    }
    parseJobCards(html) {
        const $ = (0, cheerio_1.load)(html);
        const jobs = [];
        try {
            const jobCards = $('div.base-search-card__info');
            jobCards.each((_, element) => {
                try {
                    const $card = $(element);
                    const title = $card.find('h3').text().trim();
                    const companyLink = $card.find('a.hidden-nested-link');
                    const company = companyLink.text().trim().replace(/\n/g, ' ');
                    const locationSpan = $card.find('span.job-search-card__location');
                    const location = locationSpan.text().trim();
                    const parentDiv = $card.parent();
                    const entityUrn = parentDiv.attr('data-entity-urn');
                    if (!entityUrn) {
                        return;
                    }
                    const jobPostingId = entityUrn.split(':').pop();
                    const job_url = `https://www.linkedin.com/jobs/view/${jobPostingId}/`;
                    const dateTagNew = $card.find('time.job-search-card__listdate--new');
                    const dateTag = $card.find('time.job-search-card__listdate');
                    const date = dateTag.attr('datetime') || dateTagNew.attr('datetime') || '';
                    if (title && job_url) {
                        jobs.push({
                            title,
                            company,
                            location,
                            date,
                            job_url,
                        });
                    }
                }
                catch (error) {
                    this.logger.warn(`Error parsing job card: ${error.message}`);
                }
            });
        }
        catch (error) {
            this.logger.error(`Error parsing job cards: ${error.message}`);
        }
        return jobs;
    }
    async fetchJobDescriptions(jobs) {
        const daysToScrape = this.urlBuilder.getDaysToScrape();
        const jobsWithDescriptions = [];
        for (const job of jobs) {
            if (!this.isJobRecent(job.date, daysToScrape)) {
                continue;
            }
            this.logger.log(`Found new job: ${job.title} at ${job.company} - ${job.job_url}`);
            const description = await this.fetchJobDescription(job.job_url);
            jobsWithDescriptions.push({
                ...job,
                job_description: description,
            });
            await this.sleep(500);
        }
        return jobsWithDescriptions;
    }
    async fetchJobDescription(jobUrl, maxRetries = 3) {
        const delays = [2000, 5000, 10000];
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const html = await this.fetchWithRetry(jobUrl);
                if (!html) {
                    continue;
                }
                const description = this.parseJobDescription(html);
                if (description !== 'Could not find Job Description') {
                    if (attempt > 0) {
                        this.logger.log(`Successfully fetched description on attempt ${attempt + 1}`);
                    }
                    return description;
                }
                if (attempt < maxRetries - 1) {
                    this.logger.log(`Description not found, retrying in ${delays[attempt] / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
                    await this.sleep(delays[attempt]);
                }
            }
            catch (error) {
                this.logger.warn(`Failed to fetch description on attempt ${attempt + 1}: ${error.message}`);
                if (attempt < maxRetries - 1) {
                    await this.sleep(delays[attempt]);
                }
            }
        }
        return 'Could not find Job Description';
    }
    parseJobDescription(html) {
        const $ = (0, cheerio_1.load)(html);
        const descDiv = $('div.description__text.description__text--rich');
        if (!descDiv.length) {
            return 'Could not find Job Description';
        }
        descDiv.find('span, a').remove();
        descDiv.find('ul li').each((_, li) => {
            const $li = $(li);
            $li.prepend('- ');
        });
        let text = descDiv.text().trim();
        text = text.replace(/\n\n+/g, '\n');
        text = text.replace(/::marker/g, '-');
        text = text.replace(/-\n/g, '- ');
        text = text.replace(/Show less/g, '').replace(/Show more/g, '');
        return text;
    }
    async findNewJobs(jobs) {
        const newJobs = [];
        let skippedCount = 0;
        for (const job of jobs) {
            const existsInJobs = await this.jobsRepository.findOne({
                where: { job_url: job.job_url },
            });
            if (existsInJobs) {
                skippedCount++;
                this.logger.debug(`SKIPPED (already in jobs table): ${job.title} at ${job.company}`);
                continue;
            }
            const existsInFiltered = await this.filteredJobsRepository.findOne({
                where: { job_url: job.job_url },
            });
            if (existsInFiltered) {
                skippedCount++;
                this.logger.debug(`SKIPPED (already in filtered_jobs table): ${job.title} at ${job.company}`);
                continue;
            }
            newJobs.push(job);
        }
        if (skippedCount > 0) {
            this.logger.log(`Total jobs skipped (already in database): ${skippedCount}`);
        }
        return newJobs;
    }
    async processAndSaveJobs(jobs) {
        const jobsToAdd = [];
        const jobsToFilter = [];
        for (const job of jobs) {
            const filterResult = this.filterService.filterJob({
                title: job.title,
                company: job.company,
                location: job.location,
                job_description: job.job_description,
            });
            const jobData = {
                title: job.title,
                company: job.company,
                location: job.location,
                date: job.date,
                job_url: job.job_url,
                job_description: job.job_description || '',
                applied: 0,
                hidden: 0,
                interview: 0,
                rejected: 0,
                blocked: 0,
                date_loaded: new Date().toISOString(),
            };
            if (filterResult.passed) {
                jobsToAdd.push(this.jobsRepository.create(jobData));
            }
            else {
                jobsToFilter.push(this.filteredJobsRepository.create({
                    ...jobData,
                    notes: `Filtered: ${filterResult.reason || 'Unknown reason'}`,
                }));
            }
        }
        if (jobsToAdd.length > 0) {
            await this.jobsRepository.save(jobsToAdd);
            this.logger.log(`Added ${jobsToAdd.length} jobs to database`);
        }
        if (jobsToFilter.length > 0) {
            await this.filteredJobsRepository.save(jobsToFilter);
            this.logger.log(`Added ${jobsToFilter.length} filtered jobs to database`);
        }
        return {
            jobsAdded: jobsToAdd.length,
            jobsFiltered: jobsToFilter.length,
        };
    }
    removeDuplicates(jobs) {
        const seen = new Set();
        return jobs.filter((job) => {
            if (seen.has(job.job_url)) {
                return false;
            }
            seen.add(job.job_url);
            return true;
        });
    }
    applyInitialFilters(jobs) {
        return jobs.filter((job) => {
            const result = this.filterService.filterJob({
                title: job.title,
                company: job.company,
                location: job.location,
            });
            return result.passed;
        });
    }
    isJobRecent(dateStr, daysThreshold) {
        if (!dateStr)
            return true;
        try {
            const jobDate = new Date(dateStr);
            const now = new Date();
            const diffDays = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= daysThreshold;
        }
        catch {
            return true;
        }
    }
    async fetchWithRetry(url, retries = 3, delay = 1000) {
        const headers = this.configService.get('scraper.headers', {});
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                    headers,
                    timeout: 10000,
                }));
                return response.data;
            }
            catch (error) {
                this.logger.warn(`Fetch attempt ${attempt + 1}/${retries} failed for ${url}: ${error.message}`);
                if (attempt < retries - 1) {
                    await this.sleep(delay * (attempt + 1));
                }
            }
        }
        return null;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.LinkedInScraperService = LinkedInScraperService;
exports.LinkedInScraperService = LinkedInScraperService = LinkedInScraperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(5, (0, typeorm_1.InjectRepository)(filtered_job_entity_1.FilteredJob)),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService,
        job_filter_service_1.JobFilterService,
        url_builder_service_1.UrlBuilderService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], LinkedInScraperService);
//# sourceMappingURL=linkedin-scraper.service.js.map