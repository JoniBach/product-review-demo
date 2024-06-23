const { execSync } = require('child_process');

function installDatabaseDriver(db) {
  const dbDrivers = {
    mysql: 'mysql2',
    postgres: 'pg',
    sqlite: 'sqlite3',
    mongodb: 'mongodb',
  };

  const packageName = dbDrivers[db];
  if (packageName) {
    console.log(`Installing ${packageName}...`);
    try {
      execSync(`npm install ${packageName} --save`, { stdio: 'inherit' });
    } catch (error) {
      console.log(`Initial installation failed. Retrying with --legacy-peer-deps...`);
      execSync(`npm install ${packageName} --save --legacy-peer-deps`, { stdio: 'inherit' });
    }
  }
}

module.exports = { installDatabaseDriver };
