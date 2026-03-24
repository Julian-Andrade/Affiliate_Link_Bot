const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

async function run() {
  const shopId = '298218684';
  const itemId = '23644265492';
  const appId = process.env.SHOPEE_APP_ID;
  const appSecret = process.env.SHOPEE_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log("No credentials");
    return;
  }

  const graphqlUrl = 'https://open-api.affiliate.shopee.com.br/graphql';
  const payload = {
    query: `
      query {
        __type(name: "ProductOfferV2") {
          fields {
            name
            type {
              name
              kind
            }
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
  
  const apiData = await apiRes.json();
  console.log(JSON.stringify(apiData, null, 2));
}
run();
