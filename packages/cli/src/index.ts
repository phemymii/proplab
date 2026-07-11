#!/usr/bin/env node

import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject, type ScanProgress } from '@proplab/core';
import { startServer } from '@proplab/server';

const program = new Command();

program
  .name('proplab')
  .description('Zero-config component lab — discover components, generate props, preview live')
  .version('0.1.0')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .option('--port <number>', 'Server port', '4591')
  .option('--no-open', 'Do not open browser automatically')
  .option('--no-watch', 'Disable filesystem watching')
  .option('--scan-only', 'Scan project and print stats without starting server')
  .action(async (options) => {
    const projectRoot = path.resolve(options.project);
    const port = parseInt(options.port, 10);

    console.log('');
    console.log(chalk.bold.hex('#0F766E')('  PropLab'), chalk.gray('— Component Lab'));
    console.log(chalk.gray(`  Project: ${projectRoot}`));
    console.log('');

    if (options.scanOnly) {
      const spinner = ora('Scanning components…').start();
      try {
        const catalog = await scanProject({ root: projectRoot }, (progress: ScanProgress) => {
          spinner.text = progress.message;
        });
        spinner.succeed(`Scanned in ${catalog.stats.scanDurationMs}ms`);
        console.log('');
        console.log(chalk.bold('  Stats:'));
        console.log(`  ${chalk.hex('#0F766E')('Files:')}       ${catalog.stats.totalFiles}`);
        console.log(`  ${chalk.hex('#0F766E')('Components:')}  ${catalog.stats.totalComponents}`);
        console.log(`  ${chalk.hex('#0F766E')('With props:')}  ${catalog.stats.withProps}`);
        console.log('');

        const sample = catalog.components.slice(0, 8);
        if (sample.length) {
          console.log(chalk.bold('  Components:'));
          for (const c of sample) {
            const propCount = c.props.fields.length;
            console.log(
              `  ${chalk.cyan(c.name.padEnd(20))} ${chalk.gray(c.relativePath)} ${chalk.dim(`(${propCount} props)`)}`,
            );
          }
          if (catalog.components.length > sample.length) {
            console.log(chalk.gray(`  …and ${catalog.components.length - sample.length} more`));
          }
          console.log('');
        }
      } catch (err) {
        spinner.fail('Scan failed');
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
      return;
    }

    const spinner = ora('Starting PropLab…').start();

    try {
      const server = await startServer({
        projectRoot,
        port,
        openBrowser: options.open !== false,
        watch: options.watch !== false,
      });

      spinner.succeed(`Lab running at ${chalk.cyan.underline(server.url)}`);
      console.log('');
      console.log(chalk.gray('  Press Ctrl+C to stop'));
      console.log('');

      process.on('SIGINT', async () => {
        console.log('\n' + chalk.gray('Shutting down…'));
        await server.close();
        process.exit(0);
      });
    } catch (err) {
      spinner.fail('Failed to start');
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program.parse();
