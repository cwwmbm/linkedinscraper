import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn', 'log'],
    errorHandler: (err) => {
      console.error('Error:', err.message);
      process.exit(1);
    },
  });
}

bootstrap();
