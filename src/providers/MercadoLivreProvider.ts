import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';

export class MercadoLivreProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Mercado Livre';
  }

  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname;
      return host.includes('mercadolivre.com.br') || host.includes('mlb.com.br');
    } catch {
      return false;
    }
  }

  async processUrl(url: string): Promise<ProductInfo> {
    throw new Error('Integração com Mercado Livre pausada temporariamente a pedido do usuário.');
  }
}
