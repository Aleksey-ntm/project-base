export interface LessonItem {
  key: string;
  title: string;
  icon: string;
}

export interface GroupItem {
  title: string;
  icon: string;
  lessons: LessonItem[];
}

export interface TabConfig {
  id: string;
  title: string;
  icon: string;
  groups: GroupItem[];
}

export const SECTIONS_CONFIG: TabConfig[] = [
  {
    id: 'doc',
    title: 'Обучение',
    icon: 'book',
    groups: [
      {
        title: 'Вступление',
        icon: 'journal-bookmark-fill',
        lessons: [
          { key: 'welcome_1', title: 'Добро пожаловать', icon: 'hand-index-thumb' },
          { key: 'welcome_2', title: 'Описание основных процессов', icon: 'diagram-3' },
        ],
      },
      {
        title: 'Теория',
        icon: 'stars',
        lessons: [
          { key: 'advanced_1', title: 'Интернет маркетинг', icon: 'megaphone' },
          { key: 'advanced_2', title: 'Сайты и CMS', icon: 'window-stack' },
          { key: 'advanced_4', title: 'Варианты исполнителей', icon: 'people' },
          { key: 'advanced_5', title: 'Термины', icon: 'bookmark-star' },
          { key: 'practice_theory_1', title: 'ЛПР/ЛВПР, секретарь', icon: 'person-badge' },
          { key: 'practice_theory_2', title: 'Выявление потребности', icon: 'question-circle' },
        ],
      },
      {
        title: 'Услуги',
        icon: 'graph-up',
        lessons: [
          { key: 'advanced_6', title: 'SEO', icon: 'search' },
          { key: 'advanced_7', title: 'Контекст', icon: 'bullseye' },
          { key: 'advanced_8', title: 'Тех.поддержка', icon: 'headset' },
          { key: 'advanced_9', title: 'Разработка', icon: 'code-slash' },
        ],
      },
      {
        title: 'Цены и тарифы',
        icon: 'wallet2',
        lessons: [{ key: 'advanced_10', title: 'Тарифы', icon: 'calculator' }],
      },
      {
        title: 'Практические материалы',
        icon: 'file-earmark-text',
        lessons: [
          { key: 'sales_script', title: 'Скрипт', icon: 'chat-dots' },
          { key: 'script_appendix', title: 'Приложение к скрипту', icon: 'paperclip' },
          { key: 'lead_criteria', title: 'Критерии заявки и оценка', icon: 'card-checklist' },
          { key: 'transfer_lead', title: 'Как передать заявку', icon: 'send' },
        ],
      },
      {
        title: 'Прослушивание',
        icon: 'headphones',
        lessons: [{ key: 'real_calls', title: 'Записи звонков', icon: 'telephone' }],
      },
      {
        title: 'Практические задания',
        icon: 'check2-square',
        lessons: [
          { key: 'task_1', title: 'Задание 1 (теория)', icon: 'pencil-square' },
          { key: 'task_2', title: 'Задание 2 (практика)', icon: 'pencil-square' },
        ],
      },
    ],
  },
  {
    id: 'statements_uniofweb',
    title: 'Заявления',
    icon: 'file-earmark-text',
    groups: [
      {
        title: 'Информация по юр. лицам',
        icon: 'info-circle',
        lessons: [{ key: 'two_entities', title: 'Почему у нас два юр. лица', icon: 'patch-question' }],
      },
      {
        title: 'Заявления',
        icon: 'file-text',
        lessons: [
          { key: 'day_off', title: 'Заявление на отгул', icon: 'clock-history' },
          { key: 'vacation', title: 'Заявление на отпуск', icon: 'calendar-check' },
        ],
      },
    ],
  },
  {
    id: 'other_info',
    title: 'Остальное',
    icon: 'collection',
    groups: [
      {
        title: 'Работа с конструкторами',
        icon: 'folder-fill',
        lessons: [
          { key: 'seo_tilda', title: 'Как мы работаем по СЕО с тильдой', icon: 'window-stack' },
          { key: 'seo_regionalnost', title: 'Региональность в СЕО', icon: 'window-stack' },
        ],
      },
    ],
  },
];