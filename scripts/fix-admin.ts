import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin10', 10);

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword,
      role: 'admin',
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('✅ Администратор успешно обновлен/создан:');
  console.log('Логин: admin');
  console.log('Пароль: admin10');
  console.log('Данные в БД:', user);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });