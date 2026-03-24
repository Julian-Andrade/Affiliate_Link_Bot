import { env } from './src/config/env';
import crypto from 'crypto';

async function test() {
  const graphqlUrl = 'https://open-api.affiliate.shopee.com.br/graphql';
  const payload = {
    query: `
      query {
        productOfferV2(itemId: 20737794628, shopId: 739065041) {
          nodes {
            price
            priceDiscountRate
          }
        }
      }
    `
  };
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payloadStr = JSON.stringify(payload);
  const factor = env.SHOPEE_APP_ID + timestamp + payloadStr + env.SHOPEE_APP_SECRET;
  const signature = crypto.createHash('sha256').update(factor).digest('hex');

  try {
    const linkRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SHA256 Credential=${env.SHOPEE_APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
      },
      body: payloadStr
    });
    
    const linkData = await linkRes.json();
    console.log('Response:', JSON.stringify(linkData, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
