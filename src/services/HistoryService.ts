import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class HistoryService {
  async saveHistory(data: {
    originalUrl: string;
    affiliateUrl: string;
    marketplace: string;
    telegramUserId: string;
  }) {
    try {
      await prisma.linkHistory.create({
        data,
      });
    } catch (error) {
      console.error('Erro ao salvar histórico no banco de dados:', error);
      // Não lançamos o erro para não travar a resposta do bot ao usuário
    }
  }
}
