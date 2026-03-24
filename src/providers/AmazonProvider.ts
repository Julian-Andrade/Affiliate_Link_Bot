import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';

export class AmazonProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Amazon';
  }

  canHandle(url: string): boolean {
    return url.includes('amazon.com.br') || url.includes('amzn.to');
  }

  async processUrl(url: string): Promise<ProductInfo> {
    throw new Error('Integração com Amazon ainda não implementada.');
  }
}
