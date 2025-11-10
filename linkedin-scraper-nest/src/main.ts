import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('LinkedIn Scraper API')
    .setDescription('NestJS-based LinkedIn Job Scraper API')
    .setVersion('1.0')
    .addTag('jobs')
    .addTag('scraper')
    .addTag('ai')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI with proper options
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'LinkedIn Scraper API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Serve OpenAPI JSON at /api/docs-json
  app.use('/api/docs-json', (req, res) => {
    res.json(document);
  });

  // Port configuration (3000 to run alongside Flask on 5001)
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(`Swagger UI available at: http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`OpenAPI JSON available at: http://localhost:${port}/api/docs-json`, 'Bootstrap');
}
bootstrap();
