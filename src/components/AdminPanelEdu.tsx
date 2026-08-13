'use client';

import React, { useState } from 'react';

interface AdminPanelEduProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onDeleteFromDb?: () => void;
}

export default function AdminPanelEdu({
  isEditMode,
  onToggleEditMode,
  onSave,
  onDeleteFromDb,
}: AdminPanelEduProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Кнопка-триггер (шестеренки/слайдеры) в правом нижнем углу */}
      <div
        className="ap-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Панель управления"
      >
        <i className="bi bi-sliders"></i>
      </div>

      {/* Всплывающее меню админ-панели */}
      <div className={`ap-panel ${isOpen ? 'active' : ''}`} id="floating-admin-panel">
        <div className="ap-header">
          <div className="ap-header-title">
            <div className="ap-pulse"></div>Обучение
          </div>
          <span className="ap-badge">Edu</span>
        </div>

        <div>
          <button
            onClick={() => {
              onToggleEditMode();
              setIsOpen(false);
            }}
            id="floating-edit-btn"
            className={`ap-btn ${isEditMode ? 'ap-btn-danger' : 'ap-btn-primary'}`}
            style={{ marginBottom: '8px' }}
          >
            <i className={`bi bi-${isEditMode ? 'x-circle' : 'pencil-square'}`}></i>
            <span id="floating-edit-text">
              {isEditMode ? 'Отключить редактор' : 'Включить редактор'}
            </span>
          </button>

          {isEditMode && (
            <button
              onClick={() => {
                onSave();
                setIsOpen(false);
              }}
              className="ap-btn ap-btn-success"
              style={{ marginBottom: '8px' }}
            >
              <i className="bi bi-check-lg"></i> Сохранить в БД
            </button>
          )}

          {onDeleteFromDb && (
            <button
              onClick={() => {
                onDeleteFromDb();
                setIsOpen(false);
              }}
              className="ap-btn ap-btn-danger"
            >
              <i className="bi bi-trash"></i> Удалить из БД
            </button>
          )}
        </div>
      </div>
    </>
  );
}