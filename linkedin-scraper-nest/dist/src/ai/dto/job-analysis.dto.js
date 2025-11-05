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
exports.JobAnalysisResultDto = exports.AnalyzeJobDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class AnalyzeJobDto {
    model;
}
exports.AnalyzeJobDto = AnalyzeJobDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional model override' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyzeJobDto.prototype, "model", void 0);
class JobAnalysisResultDto {
    analysis;
    jobId;
}
exports.JobAnalysisResultDto = JobAnalysisResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Analysis results as JSON object' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], JobAnalysisResultDto.prototype, "analysis", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job ID that was analyzed' }),
    __metadata("design:type", Number)
], JobAnalysisResultDto.prototype, "jobId", void 0);
//# sourceMappingURL=job-analysis.dto.js.map