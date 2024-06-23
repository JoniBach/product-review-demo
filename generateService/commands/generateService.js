const { Command } = require('commander');
const { execSync } = require('child_process');
const path = require('path');

const program = new Command();

program
  .command('generate-service')
  .description('Generate a new service')
  .action(async () => {
    const { handlePrompts } = await import('../utils/promptHandler.js');
    const { installDatabaseDriver } = require('../utils/dbInstaller');
    const { generateFiles, updateAppModule } = require('../utils/fileGenerator');

    const answers = await handlePrompts();

    const { service, db } = answers;
    const { dbHost, dbPort, dbUsername, dbPassword, dbName, dbUri } = answers;

    installDatabaseDriver(db);

    execSync(`nest generate module ${service}`, { stdio: 'inherit' });
    execSync(`nest generate controller ${service}`, { stdio: 'inherit' });
    execSync(`nest generate service ${service}`, { stdio: 'inherit' });

    generateFiles(service, db, { dbHost, dbPort, dbUsername, dbPassword, dbName, dbUri });

    updateAppModule(service);

    console.log(`Service ${service} has been generated successfully.`);
  });

program.parse(process.argv);
