import { adminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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
      const timestamp = FieldValue.serverTimestamp();
      
      // Remove undefined values to avoid Firestore errors
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      
      // Save to private linkHistory
      const historyRef = await adminDb.collection('users').doc(userId).collection('linkHistory').add({
        ...cleanData,
        createdAt: timestamp,
      });

      // Check if user has a public store
      const storeDoc = await adminDb.collection('publicStores').doc(userId).get();
      if (storeDoc.exists) {
        // Save to public store products
        await adminDb.collection('publicStores').doc(userId).collection('products').doc(historyRef.id).set({
          productTitle: data.productTitle || '',
          productImage: data.productImage || '',
          productPrice: data.productPrice || null,
          affiliateUrl: data.affiliateUrl || '',
          marketplace: data.marketplace || '',
          createdAt: timestamp,
        });
      }
    } catch (error) {
      console.error('Erro ao salvar histórico no banco de dados:', error);
      // Não lançamos o erro para não travar a resposta do bot ao usuário
    }
  }
}
