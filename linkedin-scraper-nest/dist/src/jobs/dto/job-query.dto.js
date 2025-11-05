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
exports.JobQueryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class JobQueryDto {
    hidden = false;
    applied;
    interview;
    rejected;
    blocked;
    limit = 100;
    offset = 0;
    sort = 'id';
    order = 'DESC';
}
exports.JobQueryDto = JobQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Include hidden jobs (default: false)', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], JobQueryDto.prototype, "hidden", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by applied status', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], JobQueryDto.prototype, "applied", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by interview status', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], JobQueryDto.prototype, "interview", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by rejected status', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], JobQueryDto.prototype, "rejected", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by blocked status', type: Boolean }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], JobQueryDto.prototype, "blocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Number of results (default: 100, max: 1000)', type: Number }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], JobQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Pagination offset (default: 0)', type: Number }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], JobQueryDto.prototype, "offset", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort field',
        enum: ['id', 'date', 'company', 'title', 'date_loaded'],
        default: 'id'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['id', 'date', 'company', 'title', 'date_loaded']),
    __metadata("design:type", String)
], JobQueryDto.prototype, "sort", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort order',
        enum: ['ASC', 'DESC'],
        default: 'DESC'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ASC', 'DESC']),
    __metadata("design:type", String)
], JobQueryDto.prototype, "order", void 0);
//# sourceMappingURL=job-query.dto.js.map