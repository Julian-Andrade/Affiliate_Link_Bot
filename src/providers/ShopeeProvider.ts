import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';
import { env } from '../config/env';
import crypto from 'crypto';

export class ShopeeProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Shopee';
  }

  canHandle(url: string): boolean {
    return url.includes('shopee.com.br') || url.includes('shp.ee') || url.includes('shope.ee');
  }

  async processUrl(url: string): Promise<ProductInfo> {
    // 1. Resolve URL
    const response = await fetch(url, { redirect: 'follow' });
    const finalUrl = response.url;

    // 2. Extract IDs
    let shopId, itemId;
    const match1 = finalUrl.match(/i\.(\d+)\.(\d+)/);
    if (match1) {
      shopId = match1[1];
      itemId = match1[2];
    } else {
      const match2 = finalUrl.match(/product\/(\d+)\/(\d+)/);
      if (match2) {
        shopId = match2[1];
        itemId = match2[2];
      }
    }

    let title = 'Produto Shopee';
    let imageUrl = '';
    let price = 0;
    let originalPrice = 0;
    let salesCount = 0;

    // 3. Fetch Product Info
    if (shopId && itemId && env.SHOPEE_APP_ID && env.SHOPEE_APP_SECRET) {
      try {
        const graphqlUrl = 'https://open-api.affiliate.shopee.com.br/graphql';
        const payload = {
          query: `
            query {
              productOfferV2(itemId: ${itemId}, shopId: ${shopId}) {
                nodes {
                  productName
                  imageUrl
                  price
                  priceDiscountRate
                  sales
                }
              }
            }
          `
        };
        
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const payloadStr = JSON.stringify(payload);
        const factor = env.SHOPEE_APP_ID + timestamp + payloadStr + env.SHOPEE_APP_SECRET;
        const signature = crypto.createHash('sha256').update(factor).digest('hex');

        const apiRes = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `SHA256 Credential=${env.SHOPEE_APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
          },
          body: payloadStr
        });
        
        const apiData: any = await apiRes.json();
        
        if (apiData?.data?.productOfferV2?.nodes?.length > 0) {
          const item = apiData.data.productOfferV2.nodes[0];
          title = item.productName || title;
          imageUrl = item.imageUrl || imageUrl;
          price = parseFloat(item.price || '0');
          salesCount = parseInt(item.sales || '0', 10);
          
          const discountRate = item.priceDiscountRate || 0;
          if (discountRate > 0) {
            originalPrice = price / (1 - (discountRate / 100));
          } else {
            originalPrice = price;
          }
        }
      } catch (e) {
        console.error('Erro ao buscar dados do produto na Shopee (GraphQL):', e);
      }
    }

    // 4. Generate Affiliate Link
    let affiliateUrl = finalUrl;
    try {
      if (env.SHOPEE_APP_ID && env.SHOPEE_APP_SECRET) {
        const graphqlUrl = 'https://open-api.affiliate.shopee.com.br/graphql';
        const payload = {
          query: `mutation generateShortLink($input: ShortLinkInput!) { generateShortLink(input: $input) { shortLink } }`,
          variables: { input: { originUrl: finalUrl } }
        };
        
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const payloadStr = JSON.stringify(payload);
        const factor = env.SHOPEE_APP_ID + timestamp + payloadStr + env.SHOPEE_APP_SECRET;
        const signature = crypto.createHash('sha256').update(factor).digest('hex');

        const linkRes = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `SHA256 Credential=${env.SHOPEE_APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
          },
          body: payloadStr
        });
        
        const linkData: any = await linkRes.json();
        if (linkData?.data?.generateShortLink?.shortLink) {
          affiliateUrl = linkData.data.generateShortLink.shortLink;
        } else {
          console.error('Erro na API da Shopee:', linkData);
          affiliateUrl = `${finalUrl}?custom_link=${env.SHOPEE_AFFILIATE_ID || 'fallback'}`;
        }
      } else {
        affiliateUrl = `${finalUrl}?custom_link=${env.SHOPEE_AFFILIATE_ID || 'fallback'}`;
      }
    } catch (e) {
      console.error('Erro ao gerar link de afiliado:', e);
      affiliateUrl = `${finalUrl}?custom_link=${env.SHOPEE_AFFILIATE_ID || 'fallback'}`;
    }

    return {
      title,
      imageUrl,
      price,
      originalPrice,
      affiliateUrl,
      salesCount
    };
  }
}
