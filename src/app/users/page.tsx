import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CreateUserForm from './CreateUserForm';

export default async function UsersPage() {
  const currentUser = await getCurrentUser();

  // 🔒 Защита: Доступ разрешен только администраторам
  if (!currentUser || currentUser.role !== 'admin') {
    redirect('/');
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Управление пользователями</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Создание новых учетных записей менеджеров и администраторов.
      </p>

      {/* Форма создания */}
      <CreateUserForm />
    </div>
  );
}