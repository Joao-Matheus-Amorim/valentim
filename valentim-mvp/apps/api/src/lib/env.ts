function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT) || 3333,
  DATABASE_URL: readRequiredEnv('DATABASE_URL'),
  JWT_SECRET: readRequiredEnv('JWT_SECRET'),
  WEBHOOK_SECRET: readRequiredEnv('WEBHOOK_SECRET')
};
