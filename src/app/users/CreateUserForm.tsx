'use client';

import { useState } from 'react';

export default function CreateUserForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'manager', // По умолчанию создаем менеджера
    firstName: '',
    lastName: '',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при создании пользователя');
      }

      setMessage({ type: 'success', text: `Пользователь ${data.user.username} успешно создан!` });
      setFormData({
        username: '',
        password: '',
        role: 'manager',
        firstName: '',
        lastName: '',
        email: '',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {message && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '6px',
            backgroundColor: message.type === 'success' ? '#e6f4ea' : '#fce8e6',
            color: message.type === 'success' ? '#137333' : '#c5221f',
            border: `1px solid ${message.type === 'success' ? '#a8dab5' : '#f5c2c7'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
          Логин *
        </label>
        <input
          type="text"
          required
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="manager_ivan"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
          Пароль *
        </label>
        <input
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••••"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
          Роль
        </label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="manager">Менеджер</option>
          <option value="admin">Администратор</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Имя</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Иван"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Фамилия</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Иванов"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="ivan@example.com"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.75rem',
          backgroundColor: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '0.5rem',
        }}
      >
        {loading ? 'Создание...' : 'Создать пользователя'}
      </button>
    </form>
  );
}