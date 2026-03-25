import { MarketplaceProvider, ProductInfo } from '../providers/MarketplaceProvider';
import { MarketplaceDetector } from '../providers/MarketplaceDetector';
import { HistoryService } from './HistoryService';

export class AffiliateService {
  private detector: MarketplaceDetector;
  private historyService: HistoryService;

  constructor() {
    this.detector = new MarketplaceDetector();
    this.historyService = new HistoryService();
  }

  async processUrl(
    url: string,
    userInfo: { id: string; username?: string; firstName?: string; lastName?: string },
    userId?: string,
    credentials?: any
  ): Promise<ProductInfo> {
    const provider = this.detector.detect(url);

    if (!provider) {
      throw new Error('Nenhuma URL válida encontrada ou suportada. Verifique a URL e tente novamente.');
    }

    try {
      const productInfo = await provider.processUrl(url, credentials);
      
      const fullName = [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ');

      // Salva o histórico de forma assíncrona (fire and forget)
      if (userId) {
        this.historyService.saveHistory(userId, {
          originalUrl: url,
          affiliateUrl: productInfo.affiliateUrl,
          marketplace: provider.getMarketplaceName(),
          telegramUserId: userInfo.id,
          telegramUsername: userInfo.username,
          telegramName: fullName || undefined,
          productTitle: productInfo.title,
          productImage: productInfo.imageUrl,
          productPrice: productInfo.price,
        });
      }

      return productInfo;
    } catch (error: any) {
      throw new Error(`[${provider.getMarketplaceName()}] ${error.message}`);
    }
  }
}
