import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Принудительно загружаем .env.local из корня проекта
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: connectionUrl,
  },
});