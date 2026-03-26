import { Telegraf } from 'telegraf';
import { adminDb } from './firebase-admin';
import { AffiliateService } from '../src/services/AffiliateService';
import { extractUrls } from '../src/utils/url';
import { GoogleGenAI } from '@google/genai';

const globalAny: any = globalThis;

export async function startTelegramBot() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN is not set. Bot will not start.');
      return { ok: false, error: 'Token not set' };
    }

    if (globalAny.activeTelegramBot) {
      console.log('Stopping existing bot instance...');
      try {
        globalAny.activeTelegramBot.stop('Restarting');
      } catch (e) {}
    }

    const bot = new Telegraf(botToken);
    globalAny.activeTelegramBot = bot;

    // Remove webhook to allow long polling
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });

    bot.on('text', async (ctx) => {
    try {
      const text = ctx.message.text;
      const chatId = ctx.message.chat.id.toString();
      
      console.log(`Processing text: ${text} from chat: ${chatId}`);
      
      // Handle /start command
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        if (parts.length > 1) {
          const token = parts[1];
          console.log(`Received /start with token: ${token}`);
          try {
            const usersSnapshot = await adminDb.collection('users').where('activationToken', '==', token).limit(1).get();
            
            if (usersSnapshot.empty) {
              console.log('Token not found');
              await ctx.reply('❌ Token de ativação inválido. Gere um novo token no painel.');
              return;
            }

            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({ telegramChatId: chatId });
            console.log('User telegramChatId updated');
            
            await ctx.reply(
              '✅ Bot ativado com sucesso!\n\n' +
              'Agora você pode me enviar links de produtos e eu retornarei o seu link de afiliado pronto para divulgação.\n\n' +
              'Use /help para ver os marketplaces suportados.'
            );
          } catch (dbError: any) {
            console.error('Database error during /start:', dbError);
            await ctx.reply('❌ Erro interno ao verificar o token. Tente novamente mais tarde.');
          }
        } else {
          await ctx.reply(
            '👋 Olá! Eu sou o seu Bot Gerador de Links de Afiliado.\n\n' +
            'Para me ativar, acesse o painel do afiliado, copie o seu comando de ativação e cole aqui.'
          );
        }
        return;
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
        return;
      }

      // Find user by chat ID
      const usersSnapshot = await adminDb.collection('users').where('telegramChatId', '==', chatId).limit(1).get();
      
      if (usersSnapshot.empty) {
        await ctx.reply('❌ Seu bot não está ativado. Acesse o painel e envie o comando de ativação.');
        return;
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check subscription status
      if (userData.subscriptionStatus !== 'active') {
        await ctx.reply('❌ Sua assinatura está inativa ou pendente. Acesse o painel para regularizar.');
        return;
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
        return;
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
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (e) {}

    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

    bot.launch();
    console.log('Telegram bot started with long polling');
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to start Telegram bot:', error);
    return { ok: false, error: error.message };
  }
}
