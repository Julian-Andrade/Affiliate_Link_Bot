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

  async processUrl(url: string, telegramUserId: string): Promise<ProductInfo> {
    const provider = this.detector.detect(url);

    if (!provider) {
      throw new Error('Marketplace não suportado ou URL inválida.');
    }

    try {
      const productInfo = await provider.processUrl(url);
      
      // Salva o histórico de forma assíncrona (fire and forget)
      this.historyService.saveHistory({
        originalUrl: url,
        affiliateUrl: productInfo.affiliateUrl,
        marketplace: provider.getMarketplaceName(),
        telegramUserId,
      });

      return productInfo;
    } catch (error: any) {
      throw new Error(`Erro ao processar ${provider.getMarketplaceName()}: ${error.message}`);
    }
  }
}
