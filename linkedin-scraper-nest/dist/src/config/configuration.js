"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
exports.default = () => {
    let jsonConfig = {};
    try {
        const configPath = (0, path_1.join)(process.cwd(), '..', 'config.json');
        const configFile = (0, fs_1.readFileSync)(configPath, 'utf8');
        jsonConfig = JSON.parse(configFile);
    }
    catch (error) {
        console.warn('config.json not found, using environment variables only');
    }
    return {
        database: {
            path: process.env.DB_PATH || jsonConfig['db_path'] || './data/my_database.db',
            jobsTablename: jsonConfig['jobs_tablename'] || 'jobs',
            filteredJobsTablename: jsonConfig['filtered_jobs_tablename'] || 'filtered_jobs',
        },
        ai: {
            jobAnalysisApiKey: process.env.JOB_ANALYSIS_API_KEY || jsonConfig['job_analysis_api_key'],
            jobAnalysisModel: process.env.JOB_ANALYSIS_MODEL || jsonConfig['job_analysis_model'] || 'openai/gpt-4o',
            coverLetterApiKey: process.env.COVER_LETTER_API_KEY || jsonConfig['cover_letter_api_key'],
            coverLetterModel: process.env.COVER_LETTER_MODEL || jsonConfig['cover_letter_model'] || 'google/gemini-2.5-flash-lite',
            resumeApiKey: process.env.RESUME_API_KEY || jsonConfig['resume_api_key'],
            resumeModel: process.env.RESUME_MODEL || jsonConfig['resume_model'] || 'google/gemini-2.5-flash-lite',
            pageScraperApiKey: process.env.PAGE_SCRAPER_API_KEY || jsonConfig['page_scraper_api_key'],
            pageScraperModel: process.env.PAGE_SCRAPER_MODEL || jsonConfig['page_scraper_model'] || 'google/gemini-2.5-flash-lite',
            analysisQuestions: jsonConfig['analysis_questions'] || [],
        },
        files: {
            resumePath: process.env.RESUME_PATH || jsonConfig['resume_path'] || './CV.pdf',
        },
        scraper: {
            headers: jsonConfig['headers'] || {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            proxies: jsonConfig['proxies'] || {},
            searchQueries: jsonConfig['search_queries'] || [],
            timespan: jsonConfig['timespan'] || 'r5256000',
            pagesToScrape: jsonConfig['pages_to_scrape'] || 10,
            rounds: jsonConfig['rounds'] || 1,
            daysToScrape: jsonConfig['days_to_scrape'] || 10,
        },
        filters: {
            titleExclude: jsonConfig['title_exclude'] || [],
            titleInclude: jsonConfig['title_include'] || [],
            companyExclude: jsonConfig['company_exclude'] || [],
            countryExclude: jsonConfig['country_exclude'] || [],
            descWords: jsonConfig['desc_words'] || [],
            languages: jsonConfig['languages'] || ['en'],
        },
        app: {
            port: parseInt(process.env.PORT || '3000', 10),
            nodeEnv: process.env.NODE_ENV || 'development',
        },
    };
};
//# sourceMappingURL=configuration.js.map