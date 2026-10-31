import {
  env, assertEnvironmentVariablesPresent, assertAdministratorPasswordIsStrongEnough, SERVER_REQUIRED_VARIABLE_NAMES,
} from './config/environment.js';

assertEnvironmentVariablesPresent(SERVER_REQUIRED_VARIABLE_NAMES);
assertAdministratorPasswordIsStrongEnough();

const { default: app } = await import('./app.js');

app.listen(env.port, () => console.log(`API Kim démarrée sur le port ${env.port}`));
