const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Command } = require('commander');

const program = new Command();

program
  .command('generate-service')
  .description('Generate a new service')
  .action(async () => {
    const inquirer = await import('inquirer');
    const answers = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'service',
        message: 'Service name:',
      },
      {
        type: 'list',
        name: 'db',
        message: 'Database type:',
        choices: [
          // add these later when working
          // 'mysql', 
          // 'postgres', 
          'sqlite', 
          'mongodb'
        ],
        default: 'mysql',
      },
    ]);

    const dbDetailsPrompts = [];
    if (answers.db !== 'sqlite' && answers.db !== 'mongodb') {
      dbDetailsPrompts.push(
        {
          type: 'input',
          name: 'dbHost',
          message: 'Database host:',
          default: 'localhost',
        },
        {
          type: 'input',
          name: 'dbPort',
          message: 'Database port:',
          default: answers.db === 'mysql' ? 3306 : answers.db === 'postgres' ? 5432 : 27017,
        },
        {
          type: 'input',
          name: 'dbUsername',
          message: 'Database username:',
          default: 'root',
        },
        {
          type: 'password',
          name: 'dbPassword',
          message: 'Database password:',
          mask: '*',
          default: 'password',
        }
      );
    }

    if (answers.db === 'mongodb') {
      dbDetailsPrompts.push(
        {
          type: 'input',
          name: 'dbUri',
          message: 'MongoDB connection URI:',
          default: 'mongodb://localhost:27017',
        }
      );
    }

    dbDetailsPrompts.push({
      type: 'input',
      name: 'dbName',
      message: 'Database name:',
      default: `${answers.service}_db`,
    });

    const dbDetails = await inquirer.default.prompt(dbDetailsPrompts);

    const { service, db } = answers;
    const { dbHost, dbPort, dbUsername, dbPassword, dbName, dbUri } = dbDetails;

    // Install the necessary database driver package
    installDatabaseDriver(db);

    // Generate basic structure using Nest CLI
    execSync(`nest generate module ${service}`, { stdio: 'inherit' });
    execSync(`nest generate controller ${service}`, { stdio: 'inherit' });
    execSync(`nest generate service ${service}`, { stdio: 'inherit' });

    // Modify generated files
    generateService(service, db, dbHost, dbPort, dbUsername, dbPassword, dbName, dbUri);
  });

program.parse(process.argv);

function installDatabaseDriver(db) {
  let packageName;
  switch (db) {
    case 'mysql':
      packageName = 'mysql2';
      break;
    case 'postgres':
      packageName = 'pg';
      break;
    case 'sqlite':
      packageName = 'sqlite3';
      break;
    case 'mongodb':
      packageName = 'mongodb';
      break;
  }
  if (packageName) {
    console.log(`Installing ${packageName}...`);
    execSync(`npm install ${packageName} --save`, { stdio: 'inherit' });
  }
}

function generateService(service, db, dbHost, dbPort, dbUsername, dbPassword, dbName, dbUri) {
  const serviceName = service.toLowerCase();
  const ServiceName = service.charAt(0).toUpperCase() + service.slice(1);
  const basePath = path.join(__dirname, 'src', serviceName);

  const entityDir = path.join(basePath, 'entities');
  const dtoDir = path.join(basePath, 'dto');
  if (!fs.existsSync(entityDir)) {
    fs.mkdirSync(entityDir, { recursive: true });
  }
  if (!fs.existsSync(dtoDir)) {
    fs.mkdirSync(dtoDir, { recursive: true });
  }

  if (db === 'mongodb') {
    // MongoDB-specific schema
    const schemaContent = `
import { Schema, Document, model } from 'mongoose';

export const ${ServiceName}Schema = new Schema({
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  ${serviceName}_example: { type: String, required: true },
});

export interface ${ServiceName} extends Document {
  created: Date;
  updated: Date;
  ${serviceName}_example: string;
}

export const ${ServiceName}Model = model<${ServiceName}>('${ServiceName}', ${ServiceName}Schema);
    `;

    const dtoContent = `
export class Create${ServiceName}Dto {
  ${serviceName}_example: string;
}
    `;

    const serviceContent = `
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Create${ServiceName}Dto } from './dto/create-${serviceName}.dto';
import { ${ServiceName} } from './entities/${serviceName}.schema';

@Injectable()
export class ${ServiceName}Service {
  constructor(@InjectModel('${ServiceName}') private readonly ${serviceName}Model: Model<${ServiceName}>) {}

  async create(create${ServiceName}Dto: Create${ServiceName}Dto): Promise<${ServiceName}> {
    const created${ServiceName} = new this.${serviceName}Model(create${ServiceName}Dto);
    return created${ServiceName}.save();
  }

  async findAll(): Promise<${ServiceName}[]> {
    return this.${serviceName}Model.find().exec();
  }

  async findOne(id: string): Promise<${ServiceName}> {
    return this.${serviceName}Model.findById(id).exec();
  }

  async remove(id: string): Promise<void> {
    await this.${serviceName}Model.findByIdAndDelete(id).exec();
  }
}
    `;

    const controllerContent = `
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ${ServiceName}Service } from './${serviceName}.service';
import { Create${ServiceName}Dto } from './dto/create-${serviceName}.dto';
import { ${ServiceName} } from './entities/${serviceName}.schema';

@Controller('${serviceName}')
export class ${ServiceName}Controller {
  constructor(private readonly ${serviceName}Service: ${ServiceName}Service) {}

  @Get()
  findAll(): Promise<${ServiceName}[]> {
    return this.${serviceName}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<${ServiceName}> {
    return this.${serviceName}Service.findOne(id);
  }

  @Post()
  create(@Body() create${ServiceName}Dto: Create${ServiceName}Dto): Promise<${ServiceName}> {
    return this.${serviceName}Service.create(create${ServiceName}Dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.${serviceName}Service.remove(id);
  }
}
    `;

    const moduleContent = `
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ${ServiceName}Service } from './${serviceName}.service';
import { ${ServiceName}Controller } from './${serviceName}.controller';
import { ${ServiceName}Schema } from './entities/${serviceName}.schema';

@Module({
  imports: [MongooseModule.forRoot('${dbUri}/${dbName}'), MongooseModule.forFeature([{ name: '${ServiceName}', schema: ${ServiceName}Schema }])],
  controllers: [${ServiceName}Controller],
  providers: [${ServiceName}Service],
})
export class ${ServiceName}Module {}
    `;

    fs.writeFileSync(path.join(entityDir, `${serviceName}.schema.ts`), schemaContent);
    fs.writeFileSync(path.join(dtoDir, `create-${serviceName}.dto.ts`), dtoContent);
    fs.writeFileSync(path.join(basePath, `${serviceName}.service.ts`), serviceContent);
    fs.writeFileSync(path.join(basePath, `${serviceName}.controller.ts`), controllerContent);
    fs.writeFileSync(path.join(basePath, `${serviceName}.module.ts`), moduleContent);
  } else {
    // Other databases (SQLite, MySQL, Postgres)
    const entityContent = `
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ${ServiceName} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  updated: Date;

  @Column()
  ${serviceName}_example: string;
}
    `;

    const dtoContent = `
export class Create${ServiceName}Dto {
  ${serviceName}_example: string;
}
    `;

    const serviceContent = `
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Create${ServiceName}Dto } from './dto/create-${serviceName}.dto';
import { ${ServiceName} } from './entities/${serviceName}.entity';

@Injectable()
export class ${ServiceName}Service {
  constructor(
    @InjectRepository(${ServiceName})
    private ${serviceName}Repository: Repository<${ServiceName}>,
  ) {}

  async create(create${ServiceName}Dto: Create${ServiceName}Dto): Promise<${ServiceName}> {
    const ${serviceName} = this.${serviceName}Repository.create(create${ServiceName}Dto);
    return this.${serviceName}Repository.save(${serviceName});
  }

  async findAll(): Promise<${ServiceName}[]> {
    return this.${serviceName}Repository.find();
  }

  async findOne(id: string): Promise<${ServiceName}> {
    return this.${serviceName}Repository.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.${serviceName}Repository.delete(id);
  }
}
    `;

    const controllerContent = `
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ${ServiceName}Service } from './${serviceName}.service';
import { Create${ServiceName}Dto } from './dto/create-${serviceName}.dto';
import { ${ServiceName} } from './entities/${serviceName}.entity';

@Controller('${serviceName}')
export class ${ServiceName}Controller {
  constructor(private readonly ${ServiceName}Service: ${ServiceName}Service) {}

  @Get()
  findAll(): Promise<${ServiceName}[]> {
    return this.${ServiceName}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<${ServiceName}> {
    return this.${ServiceName}Service.findOne(id);
  }

  @Post()
  create(@Body() create${ServiceName}Dto: Create${ServiceName}Dto): Promise<${ServiceName}> {
    return this.${ServiceName}Service.create(create${ServiceName}Dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.${ServiceName}Service.remove(id);
  }
}
    `;

    const moduleContent = `
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${ServiceName}Service } from './${serviceName}.service';
import { ${ServiceName}Controller } from './${serviceName}.controller';
import { ${ServiceName} } from './entities/${serviceName}.entity';

@Module({
  imports: [TypeOrmModule.forRoot({
    type: '${db}',
    ${db === 'sqlite' ? `database: '${dbName}.sqlite',` : `
    host: '${dbHost}',
    port: ${dbPort},
    username: '${dbUsername}',
    password: '${dbPassword}',
    database: '${dbName}',`}
    entities: [${ServiceName}],
    synchronize: true,
  }), TypeOrmModule.forFeature([${ServiceName}])],
  controllers: [${ServiceName}Controller],
  providers: [${ServiceName}Service],
})
export class ${ServiceName}Module {}
    `;

    fs.writeFileSync(path.join(entityDir, `${serviceName}.entity.ts`), entityContent);
    fs.writeFileSync(path.join(dtoDir, `create-${serviceName}.dto.ts`), dtoContent);
    fs.writeFileSync(path.join(basePath, `${serviceName}.service.ts`), serviceContent);
    fs.writeFileSync(path.join(basePath, `${serviceName}.controller.ts`), controllerContent);
    fs.writeFileSync(path.join(basePath, `${serviceName}.module.ts`), moduleContent);
  }

  console.log(`Service ${serviceName} has been generated successfully.`);

  // Update app.module.ts to import the new module
  updateAppModule(ServiceName, serviceName);
}

function updateAppModule(ServiceName, serviceName) {
  const appModulePath = path.join(__dirname, 'src/app.module.ts');
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
