import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';

export class MercadoLivreProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Mercado Livre';
  }

  canHandle(url: string): boolean {
    return url.includes('mercadolivre.com.br') || url.includes('mlb.com.br');
  }

  async processUrl(url: string): Promise<ProductInfo> {
    throw new Error('Integração com Mercado Livre pausada temporariamente a pedido do usuário.');
  }
}
