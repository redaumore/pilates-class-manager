export enum Level {
  Basico = 'Basico',
  Medio = 'Medio',
  Avanzado = 'Avanzado',
}

export type Plan = 1 | 2 | 3;

export interface Student {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  nivel: Level;
  fecha_inscripcion: string;
  plan: Plan;
  clases_recuperacion: number;
}

export interface Booking {
  studentId: string;
  classId: string;
  startDate: string; // YYYY-MM-DD
}

export interface Absence {
  studentId: string;
  date: string; // YYYY-MM-DD
}

export interface Class {
  id: string;
  day: string;
  time: number;
  bookings: Booking[];
  isCancelled: boolean;
  absences?: Absence[];
  oneTimeBookings?: { studentId: string; date: string; }[];
}

export type Schedule = Record<string, Class[]>;

// A record where the key is the student ID, and the value is another record
// where the key is the month-year (e.g., "2024-07") and the value is the payment date string.
export type PaymentRecord = Record<string, { [monthYear: string]: string }>;

export type PlanCosts = Record<Plan, number>;
