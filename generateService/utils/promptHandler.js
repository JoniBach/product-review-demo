async function handlePrompts() {
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
      choices: ['sqlite', 'mysql', 'postgres', 'mongodb'],
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
  return { ...answers, ...dbDetails };
}

module.exports = { handlePrompts };
