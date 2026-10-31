import type { LessonCard } from '../types/dashboard'

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function lessonCountLabel(count: number) {
  return count === 1 ? 'Una cosa para arreglar' : `${count} cosas para arreglar`
}

export function getLessonBackingFigure(lesson: LessonCard) {
  if (lesson.kind === 'champion' && lesson.championWinrate != null) {
    return { value: formatPercent(lesson.championWinrate), label: 'WINRATE' }
  }
  return null
}
