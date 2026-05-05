import { buildApp } from './app';

const port = Number(process.env.PORT) || 3333;
const app = buildApp();

app.listen({ port, host: '0.0.0.0' })
  .then(() => {
    console.log(`Server listening on ${port}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
