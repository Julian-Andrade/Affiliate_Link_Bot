import { NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { adminDb } from '../../../../../lib/firebase-admin';
import { AffiliateService } from '../../../../../src/services/AffiliateService';
import { extractUrls } from '../../../../../src/utils/url';
import { GoogleGenAI } from '@google/genai';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    // Fetch user config from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData?.telegramBotToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
    }

    // Initialize temporary bot instance
    const bot = new Telegraf(userData.telegramBotToken);
    
    // Process message if it's a text message
    if (body.message && body.message.text) {
      const ctx = {
        message: body.message,
        from: body.message.from,
        reply: (text: string, extra?: any) => bot.telegram.sendMessage(body.message.chat.id, text, extra),
        replyWithPhoto: (photo: any, extra?: any) => bot.telegram.sendPhoto(body.message.chat.id, photo, extra),
      };

      const text = ctx.message.text;
      
      if (text === '/start') {
        await ctx.reply(
          '👋 Olá! Eu sou o seu Bot Gerador de Links de Afiliado.\n\n' +
          'Envie o link de um produto e eu retornarei o seu link de afiliado pronto para divulgação.\n\n' +
          'Use /help para ver os marketplaces suportados.'
        );
        return NextResponse.json({ ok: true });
      }

      if (text === '/help') {
        await ctx.reply(
          '🛠 *Como usar:*\n' +
          'Basta me enviar uma URL de um produto.\n\n' +
          '*Marketplaces suportados atualmente:*\n' +
          '✅ Shopee\n' +
          '⏳ Mercado Livre (Pausado)\n' +
          '⏳ Amazon (Em breve)\n' +
          '⏳ Magalu (Em breve)',
          { parse_mode: 'Markdown' }
        );
        return NextResponse.json({ ok: true });
      }

      const extractedUrls = extractUrls(text);
      const urls: string[] = [];
      
      const affiliatePatterns = [
        /shopee\.com\.br/i, /shp\.ee/i, /shope\.ee/i,
        /mercadolivre\.com\.br/i, /mlb\.com\.br/i,
        /amazon\.com\.br/i, /amzn\.to/i,
        /magazineluiza\.com\.br/i, /magalu\.com/i,
        /aliexpress\.com/i, /s\.click\.aliexpress\.com/i
      ];

      for (const url of extractedUrls) {
        try {
          const parsedUrl = new URL(url);
          if (affiliatePatterns.some(pattern => pattern.test(parsedUrl.hostname))) {
            urls.push(url);
          }
        } catch (e) {}
      }

      if (urls.length === 0) {
        await ctx.reply('❌ Nenhuma URL válida encontrada ou suportada. Verifique a URL e tente novamente.');
        return NextResponse.json({ ok: true });
      }

      const processingMsg = await ctx.reply('⏳ Processando seu link...');

      // Initialize AffiliateService with user's specific credentials
      const affiliateService = new AffiliateService();
      const credentials = {
        shopeeAppId: userData.shopeeAppId,
        shopeeAppSecret: userData.shopeeAppSecret,
      };

      for (const url of urls) {
        try {
          const productInfo = await affiliateService.processUrl(url, {
            id: ctx.from.id.toString(),
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
          }, userId, credentials);
          
          const formatCurrency = (value: number) => value.toFixed(2).replace('.', ',');
          
          let layoutBlocks: any[] = [];
          if (userData.layoutConfig) {
            try {
              layoutBlocks = JSON.parse(userData.layoutConfig);
            } catch (e) {}
          }

          if (layoutBlocks.length === 0) {
            layoutBlocks = [
              { id: 'title', type: 'title', enabled: true },
              { id: 'promoPrice', type: 'promoPrice', enabled: true },
              { id: 'originalPrice', type: 'originalPrice', enabled: true },
              { id: 'affiliateLink', type: 'affiliateLink', enabled: true },
              { id: 'customText', type: 'customText', enabled: true, value: '🚚 Verifique os cupons de Frete Grátis no app!\n\n#oferta #promocao #achadinhos #shopee' }
            ];
          }

          let caption = '';
          for (const block of layoutBlocks) {
            if (!block.enabled) continue;
            switch (block.type) {
              case 'title': caption += `🛍️ <b>${productInfo.title}</b>\n\n`; break;
              case 'customCta': caption += `${block.value || ''} ${productInfo.affiliateUrl}\n\n`; break;
              case 'customText': caption += `${block.value || ''}\n\n`; break;
              case 'promoPrice': if (productInfo.price > 0) caption += `✅ Por apenas: <b>R$ ${formatCurrency(productInfo.price)}</b> 🔥\n\n`; break;
              case 'originalPrice': if (productInfo.originalPrice > 0 && productInfo.originalPrice > productInfo.price) caption += `❌ De: <s>R$ ${formatCurrency(productInfo.originalPrice)}</s>\n`; break;
              case 'affiliateLink': caption += `🛒 <b>Compre aqui:</b> ${productInfo.affiliateUrl}\n\n`; break;
              case 'coupon': caption += `🎟️ <b>Cupom:</b> ${block.value || ''}\n\n`; break;
              case 'promoWarning': caption += `🚨 <b>OFERTA IMPERDÍVEL</b> 🚨\n\n`; break;
              case 'salesCount': if (productInfo.salesCount && productInfo.salesCount > 0) caption += `🔥 +${productInfo.salesCount} vendidos\n\n`; break;
            }
          }
          caption = caption.trim();

          if (productInfo.imageUrl) {
            await ctx.replyWithPhoto({ url: productInfo.imageUrl }, { caption, parse_mode: 'HTML' });
          } else {
            try {
              const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
              const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: `A high quality, professional product photography of: ${productInfo.title}. Clean background, well lit, e-commerce style.` }] },
                config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
              });
              
              let base64Image = '';
              for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData?.data) {
                  base64Image = part.inlineData.data;
                  break;
                }
              }
              
              if (base64Image) {
                await ctx.replyWithPhoto({ source: Buffer.from(base64Image, 'base64') }, { caption, parse_mode: 'HTML' });
              } else {
                await ctx.reply(caption, { parse_mode: 'HTML' });
              }
            } catch (imgError) {
              await ctx.reply(caption, { parse_mode: 'HTML' });
            }
          }
        } catch (error: any) {
          await ctx.reply(`❌ Erro: ${error.message}`);
        }
      }

      try {
        await bot.telegram.deleteMessage(body.message.chat.id, processingMsg.message_id);
      } catch (e) {}
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
