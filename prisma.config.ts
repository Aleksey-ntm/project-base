import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://r13@localhost:5432/ntm_base?schema=public",
  },
});