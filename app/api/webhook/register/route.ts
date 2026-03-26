import { NextResponse } from 'next/server';
import { startTelegramBot } from '../../../../lib/telegram-bot';

export async function GET(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN in environment variables' }, { status: 500 });
    }

    // Check if we want to get info instead of setting
    const url = new URL(request.url);
    if (url.searchParams.get('info') === 'true') {
      return NextResponse.json({ ok: true, info: { url: 'Long Polling Mode (Dev Mode)' } });
    }

    await startTelegramBot();

    return NextResponse.json({ ok: true, message: `Bot started in long polling mode` });
  } catch (error: any) {
    console.error('Error starting bot:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
