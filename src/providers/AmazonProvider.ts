import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';

export class AmazonProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Amazon';
  }

  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname;
      return host.includes('amazon.com.br') || host.includes('amzn.to');
    } catch {
      return false;
    }
  }

  async processUrl(url: string): Promise<ProductInfo> {
    throw new Error('Integração com Amazon ainda não implementada.');
  }
}
