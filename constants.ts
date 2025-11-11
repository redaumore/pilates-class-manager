
import { Level, Schedule } from './types';

export const WEEK_SCHEDULE_CONFIG: Record<string, number[]> = {
  Lunes: [16, 17, 18, 19],
  Martes: [8, 9, 10, 16, 17, 18],
  Miércoles: [9, 10, 16, 17, 18, 19],
  Jueves: [8, 9, 10, 16, 17, 18],
  Viernes: [8, 9, 10],
};

export const generateInitialSchedule = (): Schedule => {
  const schedule: Schedule = {};
  for (const day in WEEK_SCHEDULE_CONFIG) {
    schedule[day] = WEEK_SCHEDULE_CONFIG[day].map(time => ({
      id: `${day}-${time}`,
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
   