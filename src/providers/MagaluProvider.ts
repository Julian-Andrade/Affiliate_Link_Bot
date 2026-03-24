import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';

export class MagaluProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Magazine Luiza';
  }

  canHandle(url: string): boolean {
    return url.includes('magazineluiza.com.br') || url.includes('magalu.com');
  }

  async processUrl(url: string): Promise<ProductInfo> {
    throw new Error('Integração com Magalu ainda não implementada.');
  }
}
