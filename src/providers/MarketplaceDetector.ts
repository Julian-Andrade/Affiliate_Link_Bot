import { MarketplaceProvider } from './MarketplaceProvider';
import { MercadoLivreProvider } from './MercadoLivreProvider';
import { AmazonProvider } from './AmazonProvider';
import { ShopeeProvider } from './ShopeeProvider';
import { MagaluProvider } from './MagaluProvider';

export class MarketplaceDetector {
  private providers: MarketplaceProvider[];

  constructor() {
    this.providers = [
      new MercadoLivreProvider(),
      new AmazonProvider(),
      new ShopeeProvider(),
      new MagaluProvider(),
    ];
  }

  detect(url: string): MarketplaceProvider | null {
    for (const provider of this.providers) {
      if (provider.canHandle(url)) {
        return provider;
      }
    }
    return null;
  }
}
