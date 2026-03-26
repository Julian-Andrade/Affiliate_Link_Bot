export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startTelegramBot } = await import('./lib/telegram-bot');
      await startTelegramBot();
      console.log('Telegram bot started automatically on server boot');
    } catch (e) {
      console.error('Failed to start Telegram bot on boot:', e);
    }
  }
}
