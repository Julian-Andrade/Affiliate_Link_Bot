import { adminDb } from '../../lib/firebase-admin';

export class HistoryService {
  async saveHistory(userId: string, data: {
    originalUrl: string;
    affiliateUrl: string;
    marketplace: string;
    telegramUserId: string;
    telegramUsername?: string;
    telegramName?: string;
    productTitle?: string;
    productImage?: string;
    productPrice?: number;
  }) {
    try {
      await adminDb.collection('users').doc(userId).collection('linkHistory').add({
        ...data,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Erro ao salvar histórico no banco de dados:', error);
      // Não lançamos o erro para não travar a resposta do bot ao usuário
    }
  }
}
