import { buildApp } from './app';
import { env } from './lib/env';

const app = buildApp();

app.listen({ port: env.PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`Server listening on ${env.PORT}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
