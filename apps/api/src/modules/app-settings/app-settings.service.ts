import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CURRENT_MONTH_SETTING_KEY = 'current_month';

function toDefaultCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentMonth() {
    const setting = await this.prisma.setting.findUnique({ where: { key: CURRENT_MONTH_SETTING_KEY } });
    return { currentMonth: setting?.value?.trim() || toDefaultCurrentMonth() };
  }

  async updateCurrentMonth(currentMonth: string) {
    await this.prisma.setting.upsert({
      where: { key: CURRENT_MONTH_SETTING_KEY },
      create: { key: CURRENT_MONTH_SETTING_KEY, value: currentMonth },
      update: { value: currentMonth },
    });

    return { currentMonth };
  }
}
