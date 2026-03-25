export interface ProductInfo {
  title: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  affiliateUrl: string;
  salesCount?: number;
}

export interface MarketplaceProvider {
  getMarketplaceName(): string;
  canHandle(url: string): boolean;
  processUrl(url: string, credentials?: any): Promise<ProductInfo>;
}
