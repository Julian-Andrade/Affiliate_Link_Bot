import { MarketplaceProvider, ProductInfo } from './MarketplaceProvider';
import * as crypto from 'crypto';

export class ShopeeProvider implements MarketplaceProvider {
  getMarketplaceName(): string {
    return 'Shopee';
  }

  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname;
      return host.includes('shopee.com.br') || host.includes('shp.ee') || host.includes('shope.ee');
    } catch {
      return false;
    }
  }

  async processUrl(url: string, credentials?: any): Promise<ProductInfo> {
    // 1. Resolve URL
    let finalUrl = url;
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`Servidor retornou status ${response.status}`);
      }
      finalUrl = response.url;
    } catch (e: any) {
      throw new Error(`Não foi possível acessar o link fornecido. Verifique se a URL está correta. Detalhes: ${e.message}`);
    }

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

    const appId = credentials?.shopeeAppId || process.env.SHOPEE_APP_ID;
    const appSecret = credentials?.shopeeAppSecret || process.env.SHOPEE_APP_SECRET;

    // 3. Fetch Product Info
    if (shopId && itemId && appId && appSecret) {
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
        const factor = appId + timestamp + payloadStr + appSecret;
        const signature = crypto.createHash('sha256').update(factor).digest('hex');

        const apiRes = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
          },
          body: payloadStr
        });
        
        const apiData: any = await apiRes.json();
        
        if (apiData?.errors) {
          console.warn('Aviso: API da Shopee retornou erro ao buscar dados do produto:', apiData.errors);
        } else if (apiData?.data?.productOfferV2?.nodes?.length > 0) {
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
      if (appId && appSecret) {
        const graphqlUrl = 'https://open-api.affiliate.shopee.com.br/graphql';
        const payload = {
          query: `mutation generateShortLink($input: ShortLinkInput!) { generateShortLink(input: $input) { shortLink } }`,
          variables: { input: { originUrl: finalUrl } }
        };
        
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const payloadStr = JSON.stringify(payload);
        const factor = appId + timestamp + payloadStr + appSecret;
        const signature = crypto.createHash('sha256').update(factor).digest('hex');

        const linkRes = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
          },
          body: payloadStr
        });
        
        const linkData: any = await linkRes.json();
        
        if (linkData?.errors) {
          throw new Error(`A API da Shopee recusou a geração do link: ${linkData.errors[0]?.message || 'Erro desconhecido'}`);
        }
        
        if (linkData?.data?.generateShortLink?.shortLink) {
          affiliateUrl = linkData.data.generateShortLink.shortLink;
        } else {
          throw new Error('A API da Shopee não retornou o link encurtado de afiliado.');
        }
      } else {
        if (!process.env.SHOPEE_AFFILIATE_ID) {
          throw new Error('Credenciais da Shopee (App ID/Secret ou Affiliate ID) não estão configuradas no sistema.');
        }
        affiliateUrl = `${finalUrl}?custom_link=${process.env.SHOPEE_AFFILIATE_ID}`;
      }
    } catch (e: any) {
      console.error('Erro ao gerar link de afiliado:', e);
      throw new Error(`Falha ao gerar link de afiliado: ${e.message}`);
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
