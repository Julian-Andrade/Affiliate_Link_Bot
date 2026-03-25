import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { env } from './config/env';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function bootstrap() {
  try {
    await app.prepare();

    // Inicia o Servidor HTTP (Next.js)
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    server.listen(parseInt(env.PORT), '0.0.0.0', () => {
      console.log(`🚀 Servidor HTTP (Next.js) rodando na porta ${env.PORT}`);
    });

    // Habilita graceful stop
    process.once('SIGINT', () => {
      server.close();
    });
    process.once('SIGTERM', () => {
      server.close();
    });
  } catch (err) {
    console.error('Erro ao iniciar a aplicação:', err);
    process.exit(1);
  }
}

bootstrap();
