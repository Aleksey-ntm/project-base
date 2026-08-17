'use client';

import React, { useState, useEffect, useRef } from 'react';

interface HeaderSearchProps {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  userRole?: 'admin' | 'manager' | string;
  isEditMode?: boolean;
  isEditDisabled?: boolean;
  onToggleEditMode?: () => void;
  onOpenSettings?: () => void;
  isLeftCollapsed?: boolean;
}

export default function HeaderSearch({
  firstName,
  lastName,
  email = '',
  userRole = 'manager',
  isEditMode = false,
  isEditDisabled = false,
  onToggleEditMode,
  onOpenSettings,
  isLeftCollapsed = false,
}: HeaderSearchProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Имя для нижней плашки (только Имя)
  const shortName = firstName?.trim() || email.split('@')[0] || 'Пользователь';

  // Полное имя для развернутого меню (Имя Фамилия)
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || shortName;

  // Название роли с заглавной буквы
  const roleLabel = userRole === 'admin' ? 'Администратор' : 'Менеджер';

  // ХОТКЕЙ ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ЗАКРЫТИЕ ПРИ КЛИКЕ СНАРУЖИ
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      <div className={`profile-bottom-left ${isLeftCollapsed ? 'collapsed' : ''}`} ref={profileMenuRef}>
        <div 
          className="profile-trigger" 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
        >
          <div className="profile-avatar">
            <i className="bi bi-person-fill"></i>
          </div>

          <div className="profile-info">
            <span className="profile-name">{shortName}</span>
            <span className="profile-role-badge">{roleLabel}</span>
          </div>
        </div>

        {isProfileOpen && (
          <div className="profile-dropdown">
            <div className="profile-dropdown-header">
              <div className="profile-dropdown-avatar">
                <i className="bi bi-person-fill"></i>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div className="profile-dropdown-name">{fullName}</div>
                {email && <div className="profile-dropdown-email">{email}</div>}
              </div>
            </div>

            {onOpenSettings && (
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsProfileOpen(false);
                }}
                className="profile-dropdown-item"
              >
                <i className="bi bi-sliders"></i>
                Настройки
              </button>
            )}

            {userRole === 'admin' && onToggleEditMode && (
              <button
                onClick={() => {
                  onToggleEditMode();
                  setIsProfileOpen(false);
                }}
                className="profile-dropdown-item"
                disabled={isEditDisabled}
                style={{ opacity: isEditDisabled ? 0.5 : 1, cursor: isEditDisabled ? 'not-allowed' : 'pointer' }}
              >
                <i className={`bi ${isEditDisabled ? 'bi-lock-fill' : isEditMode ? 'bi-pencil-fill' : 'bi-pencil'}`}></i>
                {isEditDisabled ? 'Редактор недоступен' : isEditMode ? 'Выйти из редактора' : 'Редактирование'}
              </button>
            )}

            <a href="/login?logout=1" className="profile-dropdown-item profile-dropdown-logout">
              <i className="bi bi-box-arrow-right"></i> Выйти
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-bottom-left.collapsed .profile-info {
          opacity: 0 !important;
          transform: translateX(-20px) !important;
          pointer-events: none !important;
          max-width: 0 !important;
          overflow: hidden !important;
        }

        .profile-bottom-left.collapsed .profile-trigger {
          padding: 8px 12px !important;
        }

        .profile-bottom-left.collapsed .profile-avatar {
          margin-right: 0 !important;
        }

        .profile-bottom-left {
          position: fixed;
          bottom: 20px;
          left: max(20px, calc((100vw - 1600px) / 2));
          display: flex;
          align-items: center;
          z-index: 99998;
          font-family: system-ui, -apple-system, sans-serif;
          pointer-events: none;
          box-sizing: border-box;
        }

        .profile-trigger {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px !important;
          background: transparent;
          border: none;
          box-shadow: none;
          cursor: pointer;
          user-select: none;
          pointer-events: auto;
          width: 100%;
          transition: padding 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .profile-avatar {
          width: 32px;
          min-width: 32px;
          height: 32px;
          margin-left: -6px;
          margin-right: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 15px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
          transition: margin 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          line-height: 1.2;
          white-space: nowrap;
          opacity: 1;
          transform: translateX(0);
          transition: opacity 0.3s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .profile-name {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .profile-role-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 100px;
          background: #0f172a;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          text-transform: none; /* Убран UPPERCASE */
          letter-spacing: 0.02em;
        }

        .profile-dropdown {
          position: fixed !important;
          bottom: 70px !important; 
          left: calc(max(20px, calc((100vw - 1600px) / 2)) + 10px) !important;
          min-width: 240px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.25);
          animation: dropdownSlide 0.2s ease;
          pointer-events: auto;
          z-index: 99999;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .profile-dropdown-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px 12px 12px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 6px;
        }

        .profile-dropdown-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 16px;
          flex-shrink: 0;
        }

        .profile-dropdown-name {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-dropdown-email {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .profile-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }

        .profile-dropdown-item:hover {
          background: #f8fafc;
        }

        .profile-dropdown-item i {
          font-size: 16px;
          color: #94a3b8;
          width: 20px;
          text-align: center;
        }

        .profile-dropdown-logout {
          color: #ef4444;
          border-top: 1px solid #f1f5f9;
          margin-top: 4px;
          padding-top: 10px;
        }

        .profile-dropdown-logout:hover {
          background: #fef2f2;
        }

        @media (max-width: 768px) {
          .profile-bottom-left {
            bottom: 12px;
          }

          .profile-avatar {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .profile-name {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}