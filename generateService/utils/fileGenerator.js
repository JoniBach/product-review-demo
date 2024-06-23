const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

function generateFiles(service, db, dbDetails) {
  const serviceName = service.toLowerCase();
  const ServiceName = service.charAt(0).toUpperCase() + service.slice(1);
  const basePath = path.join(__dirname, '..', '..', 'src', serviceName);

  const entityDir = path.join(basePath, 'entities');
  const dtoDir = path.join(basePath, 'dto');
  if (!fs.existsSync(entityDir)) {
    fs.mkdirSync(entityDir, { recursive: true });
  }
  if (!fs.existsSync(dtoDir)) {
    fs.mkdirSync(dtoDir, { recursive: true });
  }

  const templateData = { ServiceName, serviceName, db, ...dbDetails };

  const templateType = db === 'mongodb' ? 'mongodb' : 'sql';
  const templates = [
    { template: 'controller.hbs', output: `${serviceName}.controller.ts`, dir: basePath },
    { template: 'dto.hbs', output: `create-${serviceName}.dto.ts`, dir: dtoDir },
    { template: db === 'mongodb' ? 'schema.hbs' : 'entity.hbs', output: `${serviceName}.${db === 'mongodb' ? 'schema.ts' : 'entity.ts'}`, dir: entityDir },
    { template: 'service.hbs', output: `${serviceName}.service.ts`, dir: basePath },
    { template: 'module.hbs', output: `${serviceName}.module.ts`, dir: basePath },
  ];

  // Add Dockerfile and docker-compose.yml templates
  const dockerTemplates = [
    { template: 'Dockerfile.hbs', output: 'Dockerfile', dir: path.join(__dirname, '..', '..') },
    { template: 'docker-compose.yml.hbs', output: 'docker-compose.yml', dir: path.join(__dirname, '..', '..') },
  ];

  templates.forEach(({ template, output, dir }) => {
    const templatePath = path.join(__dirname, '..', 'templates', templateType, template);
    const outputPath = path.join(dir, output);
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(templateContent);
    const fileContent = compiledTemplate(templateData);
    fs.writeFileSync(outputPath, fileContent, 'utf-8');
  });

  // Generate Docker-related files
  // dockerTemplates.forEach(({ template, output, dir }) => {
  //   const templatePath = path.join(__dirname, '..', 'templates', 'docker', template);
  //   const outputPath = path.join(dir, output);
  //   const templateContent = fs.readFileSync(templatePath, 'utf-8');
  //   const compiledTemplate = Handlebars.compile(templateContent);
  //   const fileContent = compiledTemplate(templateData);
  //   fs.writeFileSync(outputPath, fileContent, 'utf-8');
  // });
}

function updateAppModule(service) {
  const serviceName = service.toLowerCase();
  const ServiceName = service.charAt(0).toUpperCase() + service.slice(1);
  const appModulePath = path.join(__dirname, '..', '..', 'src', 'app.module.ts'); // Corrected path
  let appModuleContent = fs.readFileSync(appModulePath, 'utf-8');

  // Add import statement
  const importStatement = `import { ${ServiceName}Module } from './${serviceName}/${serviceName}.module';`;
  if (!appModuleContent.includes(importStatement)) {
    appModuleContent = appModuleContent.replace(
      /(imports: \[)/,
      `$1\n    ${ServiceName}Module,`
    );
    appModuleContent = importStatement + '\n' + appModuleContent;
    fs.writeFileSync(appModulePath, appModuleContent, 'utf-8');
  }
}

module.exports = { generateFiles, updateAppModule };
