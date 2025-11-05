"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nest_commander_1 = require("nest-commander");
const cli_module_1 = require("./cli/cli.module");
async function bootstrap() {
    await nest_commander_1.CommandFactory.run(cli_module_1.CliModule, {
        logger: ['error', 'warn', 'log'],
        errorHandler: (err) => {
            console.error('Error:', err.message);
            process.exit(1);
        },
    });
}
bootstrap();
//# sourceMappingURL=cli.js.map