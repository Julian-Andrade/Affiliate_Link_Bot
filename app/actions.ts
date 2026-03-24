'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function updateBotConfig(formData: FormData) {
  const layoutConfigString = formData.get('layoutConfig') as string;

  if (!layoutConfigString) return { success: false, error: 'No config provided' };

  let layoutConfig;
  try {
    layoutConfig = JSON.parse(layoutConfigString);
  } catch (e) {
    console.error('Invalid layout config JSON');
    return { success: false, error: 'Invalid JSON' };
  }

  try {
    const config = await prisma.botConfig.findFirst();

    if (config) {
      await prisma.botConfig.update({
        where: { id: config.id },
        data: { layoutConfig },
      });
    } else {
      await prisma.botConfig.create({
        data: { layoutConfig },
      });
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Database error:', error);
    return { success: false, error: error.message || 'Database error' };
  }
}
