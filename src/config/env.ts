import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "O token do bot do Telegram é obrigatório"),
  DATABASE_URL: z.string().url("A URL do banco de dados deve ser válida"),
  PORT: z.string().default('3000'),
  SHOPEE_AFFILIATE_ID: z.string().optional(),
  SHOPEE_APP_ID: z.string().optional(),
  SHOPEE_APP_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
