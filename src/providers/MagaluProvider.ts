import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';

export class MagaluProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Magazine Luiza';
  }

  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname;
      return host.includes('magazineluiza.com.br') || host.includes('magalu.com');
    } catch {
      return false;
    }
  }

  async processUrl(url: string): Promise<ProductInfo> {
    throw new Error('Integração com Magalu ainda não implementada.');
  }
}
