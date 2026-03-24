import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { AffiliateService } from '../services/AffiliateService';
import { extractUrls } from '../utils/url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupBot = () => {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  const affiliateService = new AffiliateService();

  bot.start((ctx) => {
    ctx.reply(
      '👋 Olá! Eu sou o seu Bot Gerador de Links de Afiliado.\n\n' +
      'Envie o link de um produto e eu retornarei o seu link de afiliado pronto para divulgação.\n\n' +
      'Use /help para ver os marketplaces suportados.'
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      '🛠 *Como usar:*\n' +
      'Basta me enviar uma URL de um produto.\n\n' +
      '*Marketplaces suportados atualmente:*\n' +
      '✅ Shopee\n' +
      '⏳ Mercado Livre (Pausado)\n' +
      '⏳ Amazon (Em breve)\n' +
      '⏳ Magalu (Em breve)',
      { parse_mode: 'Markdown' }
    );
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const urls = extractUrls(text);

    if (urls.length === 0) {
      return ctx.reply('❌ Nenhuma URL válida encontrada na sua mensagem.');
    }

    const processingMsg = await ctx.reply('⏳ Processando seu link...');

    for (const url of urls) {
      try {
        const productInfo = await affiliateService.processUrl(url, ctx.from.id.toString());
        
        const formatCurrency = (value: number) => value.toFixed(2).replace('.', ',');
        
        const config = await prisma.botConfig.findFirst();
        let layoutBlocks: any[] = [];
        
        if (config && config.layoutConfig) {
          try {
            layoutBlocks = config.layoutConfig as any[];
          } catch (e) {
            console.error('Failed to parse layout config');
          }
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
            case 'title':
              caption += `🛍️ <b>${productInfo.title}</b>\n\n`;
              break;
            case 'customCta':
              caption += `${block.value || ''} ${productInfo.affiliateUrl}\n\n`;
              break;
            case 'customText':
              caption += `${block.value || ''}\n\n`;
              break;
            case 'promoPrice':
              if (productInfo.price > 0) {
                caption += `✅ Por apenas: <b>R$ ${formatCurrency(productInfo.price)}</b> 🔥\n\n`;
              }
              break;
            case 'originalPrice':
              if (productInfo.originalPrice > 0 && productInfo.originalPrice > productInfo.price) {
                caption += `❌ De: <s>R$ ${formatCurrency(productInfo.originalPrice)}</s>\n`;
              }
              break;
            case 'affiliateLink':
              caption += `🛒 <b>Compre aqui:</b> ${productInfo.affiliateUrl}\n\n`;
              break;
            case 'coupon':
              caption += `🎟️ <b>Cupom:</b> ${block.value || ''}\n\n`;
              break;
            case 'promoWarning':
              caption += `🚨 <b>OFERTA IMPERDÍVEL</b> 🚨\n\n`;
              break;
            case 'salesCount':
              if (productInfo.salesCount && productInfo.salesCount > 0) {
                caption += `🔥 +${productInfo.salesCount} vendidos\n\n`;
              }
              break;
          }
        }

        // Trim trailing newlines
        caption = caption.trim();

        if (productInfo.imageUrl) {
          await ctx.replyWithPhoto(
            { url: productInfo.imageUrl },
            { caption, parse_mode: 'HTML' }
          );
        } else {
          await ctx.reply(caption, { parse_mode: 'HTML' });
        }
      } catch (error: any) {
        await ctx.reply(`❌ Erro: ${error.message}`);
      }
    }

    // Remove a mensagem de "processando"
    try {
      await ctx.deleteMessage(processingMsg.message_id);
    } catch (e) {
      // Ignora se não conseguir deletar
    }
  });

  bot.catch((err, ctx) => {
    console.error(`Erro no bot para o update ${ctx.updateType}`, err);
  });

  return bot;
};
