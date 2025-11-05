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
exports.ConfigController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
let ConfigController = class ConfigController {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    getConfig() {
        return {
            analysis_questions: this.configService.get('ai.analysisQuestions'),
            filters: {
                title_exclude: this.configService.get('filters.titleExclude'),
                title_include: this.configService.get('filters.titleInclude'),
                company_exclude: this.configService.get('filters.companyExclude'),
                country_exclude: this.configService.get('filters.countryExclude'),
                languages: this.configService.get('filters.languages'),
            },
            scraper: {
                pages_to_scrape: this.configService.get('scraper.pagesToScrape'),
                rounds: this.configService.get('scraper.rounds'),
                days_to_scrape: this.configService.get('scraper.daysToScrape'),
                timespan: this.configService.get('scraper.timespan'),
            },
        };
    }
};
exports.ConfigController = ConfigController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get sanitized configuration for frontend' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "getConfig", null);
exports.ConfigController = ConfigController = __decorate([
    (0, common_1.Controller)('config'),
    (0, swagger_1.ApiTags)('config'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ConfigController);
//# sourceMappingURL=config.controller.js.map