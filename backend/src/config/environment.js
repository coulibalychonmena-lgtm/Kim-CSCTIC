import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',').map((url) => url.trim()).filter(Boolean),
  snowflake: {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USER,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    schema: process.env.SNOWFLAKE_SCHEMA,
  },
  administrator: {
    fullName: process.env.ADMIN_FULL_NAME || 'Administrateur',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
};

export const SNOWFLAKE_VARIABLE_NAMES = [
  'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PASSWORD',
  'SNOWFLAKE_DATABASE', 'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA',
];
export const SERVER_REQUIRED_VARIABLE_NAMES = [
  ...SNOWFLAKE_VARIABLE_NAMES,
  'GEMINI_API_KEY', 'JWT_SECRET',
  'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
];

const MINIMUM_ADMIN_PASSWORD_LENGTH = 10;

/** Arrête le processus si une variable d'environnement obligatoire manque. */
export function assertEnvironmentVariablesPresent(variableNames) {
  const missing = variableNames.filter((variableName) => !process.env[variableName]);
  if (missing.length) {
    console.error(`Variables d'environnement manquantes : ${missing.join(', ')}`);
    process.exit(1);
  }
}

/** Arrête le processus si le mot de passe administrateur est trop court. */
export function assertAdministratorPasswordIsStrongEnough() {
  if (env.administrator.password.length < MINIMUM_ADMIN_PASSWORD_LENGTH) {
    console.error(`ADMIN_PASSWORD doit contenir au moins ${MINIMUM_ADMIN_PASSWORD_LENGTH} caractères.`);
    process.exit(1);
  }
}
