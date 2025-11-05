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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisHealthIndicator = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const bull_1 = require("@nestjs/bull");
let RedisHealthIndicator = class RedisHealthIndicator extends terminus_1.HealthIndicator {
    scraperQueue;
    constructor(scraperQueue) {
        super();
        this.scraperQueue = scraperQueue;
    }
    async isHealthy(key) {
        try {
            const client = await this.scraperQueue.client;
            const pong = await client.ping();
            const isHealthy = pong === 'PONG';
            const result = this.getStatus(key, isHealthy, {
                message: 'Redis is connected and responding',
            });
            if (isHealthy) {
                return result;
            }
            throw new terminus_1.HealthCheckError('Redis health check failed', result);
        }
        catch (error) {
            const result = this.getStatus(key, false, {
                message: `Redis connection failed: ${error.message}`,
            });
            throw new terminus_1.HealthCheckError('Redis health check failed', result);
        }
    }
};
exports.RedisHealthIndicator = RedisHealthIndicator;
exports.RedisHealthIndicator = RedisHealthIndicator = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)('scraper')),
    __metadata("design:paramtypes", [Object])
], RedisHealthIndicator);
//# sourceMappingURL=redis.health.js.map