declare const _default: () => {
    database: {
        path: any;
        jobsTablename: any;
        filteredJobsTablename: any;
    };
    ai: {
        jobAnalysisApiKey: any;
        jobAnalysisModel: any;
        coverLetterApiKey: any;
        coverLetterModel: any;
        resumeApiKey: any;
        resumeModel: any;
        pageScraperApiKey: any;
        pageScraperModel: any;
        analysisQuestions: any;
    };
    files: {
        resumePath: any;
    };
    scraper: {
        headers: any;
        proxies: any;
        searchQueries: any;
        timespan: any;
        pagesToScrape: any;
        rounds: any;
        daysToScrape: any;
    };
    filters: {
        titleExclude: any;
        titleInclude: any;
        companyExclude: any;
        countryExclude: any;
        descWords: any;
        languages: any;
    };
    app: {
        port: number;
        nodeEnv: string;
    };
};
export default _default;
