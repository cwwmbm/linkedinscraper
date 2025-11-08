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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlBuilderService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let UrlBuilderService = class UrlBuilderService {
    configService;
    BASE_URL = 'https://www.linkedin.com/jobs/search/';
    constructor(configService) {
        this.configService = configService;
    }
    buildSearchUrl(query, start = 0) {
        const params = new URLSearchParams();
        if (query.keywords) {
            params.append('keywords', query.keywords);
        }
        if (query.location) {
            params.append('location', query.location);
        }
        if (query.f_WT) {
            params.append('f_WT', query.f_WT);
        }
        if (query.f_JT) {
            params.append('f_JT', query.f_JT);
        }
        if (query.f_TPR) {
            params.append('f_TPR', query.f_TPR);
        }
        Object.keys(query).forEach((key) => {
            if (!['keywords', 'location', 'f_WT', 'f_JT', 'f_TPR'].includes(key) && query[key]) {
                params.append(key, query[key]);
            }
        });
        if (start > 0) {
            params.append('start', start.toString());
        }
        return `${this.BASE_URL}?${params.toString()}`;
    }
    getSearchQueries() {
        return this.configService.get('scraper.searchQueries', []);
    }
    getTimespan() {
        return this.configService.get('scraper.timespan', 'r5256000');
    }
    getPagesToScrape() {
        return this.configService.get('scraper.pagesToScrape', 10);
    }
    getRounds() {
        return this.configService.get('scraper.rounds', 1);
    }
    getDaysToScrape() {
        return this.configService.get('scraper.daysToScrape', 10);
    }
    buildAllSearchUrls() {
        const queries = this.getSearchQueries();
        const timespan = this.getTimespan();
        return queries.map((query) => {
            const queryWithTimespan = {
                ...query,
                f_TPR: query.f_TPR || timespan,
            };
            return this.buildSearchUrl(queryWithTimespan);
        });
    }
    buildPaginatedUrls(query, numPages) {
        const urls = [];
        const resultsPerPage = 25;
        for (let page = 0; page < numPages; page++) {
            const start = page * resultsPerPage;
            urls.push(this.buildSearchUrl(query, start));
        }
        return urls;
    }
};
exports.UrlBuilderService = UrlBuilderService;
exports.UrlBuilderService = UrlBuilderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UrlBuilderService);
//# sourceMappingURL=url-builder.service.js.map