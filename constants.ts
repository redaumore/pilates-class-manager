
import { Level, Schedule, ScheduleConfig } from './types';

export const WEEK_SCHEDULE_CONFIG: Record<string, number[]> = {
  Lunes: [16, 17, 18, 19],
  Martes: [8, 9, 10, 16, 17, 18],
  Miércoles: [9, 10, 16, 17, 18, 19],
  Jueves: [8, 9, 10, 16, 17, 18],
  Viernes: [8, 9, 10],
};

export const DAY_CODE_MAP: Record<string, string> = {
  L: 'Lunes',
  M: 'Martes',
  X: 'Miércoles',
  J: 'Jueves',
  V: 'Viernes',
  S: 'Sábado',
  D: 'Domingo',
};

export const DAY_NAME_TO_CODE: Record<string, string> = {
  Lunes: 'L',
  Martes: 'M',
  Miércoles: 'X',
  Jueves: 'J',
  Viernes: 'V',
  Sábado: 'S',
  Domingo: 'D',
};

export const generateInitialSchedule = (config?: ScheduleConfig): Schedule => {
  const schedule: Schedule = {};
  const activeConfig = config || WEEK_SCHEDULE_CONFIG;

  for (const day in activeConfig) {
    schedule[day] = activeConfig[day].map(time => ({
      id: `${DAY_NAME_TO_CODE[day]}${time}`,
      day,
      time,
      bookings: [],
      isCancelled: false,
    }));
  }
  return schedule;
};

export const LEVEL_HIERARCHY: Record<Level, number> = {
  [Level.Basico]: 0,
  [Level.Medio]: 1,
  [Level.Avanzado]: 2,
};

export const MAX_CAPACITY = 5;
