import Fastify from 'fastify';

export const setupServer = () => {
  const fastify = Fastify({
    logger: true,
  });

  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return fastify;
};
