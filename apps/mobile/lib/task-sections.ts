import { TASK_CATEGORIES, TASK_RECURRENCE } from '@kidsapp/shared';
import type { TaskCategory, TaskRecurrence } from '@kidsapp/shared';
import { t } from './i18n';

export const TASK_SECTION_CATEGORY_ORDER: TaskCategory[] = [
  'home',
  'school',
  'hobby',
  'sport',
  'social',
];

export type TaskSectionKey = 'daily' | TaskCategory;

export type TaskSection<T> = {
  key: TaskSectionKey;
  title: string;
  icon: string;
  items: T[];
};

export function taskSectionTitle(key: TaskSectionKey): string {
  if (key === 'daily') return t('taskSectionDaily');
  if (key === 'hobby') return t('taskSectionHobby');
  if (key === 'home') return t('taskSectionHome');
  if (key === 'school') return t('taskSectionSchool');
  if (key === 'sport') return t('taskSectionSport');
  return TASK_CATEGORIES[key].label;
}

export function taskSectionIcon(key: TaskSectionKey): string {
  if (key === 'daily') return TASK_RECURRENCE.daily.icon;
  return TASK_CATEGORIES[key].icon;
}

export function groupByTaskSection<T extends { recurrence: TaskRecurrence; category: TaskCategory }>(
  items: T[]
): TaskSection<T>[] {
  const sections: TaskSection<T>[] = [];
  const daily = items.filter((item) => item.recurrence === 'daily');
  if (daily.length) {
    sections.push({
      key: 'daily',
      title: taskSectionTitle('daily'),
      icon: taskSectionIcon('daily'),
      items: daily,
    });
  }

  const rest = items.filter((item) => item.recurrence !== 'daily');
  for (const category of TASK_SECTION_CATEGORY_ORDER) {
    const list = rest.filter((item) => item.category === category);
    if (!list.length) continue;
    sections.push({
      key: category,
      title: taskSectionTitle(category),
      icon: taskSectionIcon(category),
      items: list,
    });
  }

  return sections;
}
