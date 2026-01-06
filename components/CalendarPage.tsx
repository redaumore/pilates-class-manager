import React, { useState } from 'react';
import { Schedule, Student, Class, NonWorkingDay } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon } from './icons';
import { MAX_CAPACITY } from '../constants';

// Mapping from JS getDay() index (Sun=0) to our schedule keys
const dayIndexToName: { [key: number]: string } = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo',
};

const DAY_CODES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

interface CalendarPageProps {
  schedule: Schedule;
  students: Student[];
  onClassClick: (classData: Class, date: string) => void;
  nonWorkingDays: NonWorkingDay[];
  onYearChange?: (year: string) => void;
  workingDays?: string[];
}

const isDateNonWorking = (date: Date, holidays: NonWorkingDay[]): NonWorkingDay | undefined => {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.find(h => {
    return dateStr >= h.startDate && dateStr <= h.endDate;
  });
};

const CalendarPage: React.FC<CalendarPageProps> = ({ schedule, students, onClassClick, nonWorkingDays, onYearChange, workingDays }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1); // Avoid month skipping issues
      newDate.setMonth(newDate.getMonth() + amount);

      if (onYearChange && newDate.getFullYear() !== prev.getFullYear()) {
        onYearChange(newDate.getFullYear().toString());
      }

      return newDate;
    });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const activeWorkingDays = workingDays || ['L', 'M', 'X', 'J', 'V'];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthActiveDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i);
    const dayOfWeek = day.getDay();
    const dayCode = DAY_CODES[dayOfWeek];
    if (activeWorkingDays.includes(dayCode)) {
      monthActiveDays.push(day);
    }
  }

  const calendarDays = [];
  if (monthActiveDays.length > 0) {
    // Find the first day of the week that is "active" 
    // This is tricky for padding. Let's find the logical index in activeWorkingDays
    const firstDay = monthActiveDays[0];
    const firstDayCode = DAY_CODES[firstDay.getDay()];
    const padding = activeWorkingDays.indexOf(firstDayCode);

    for (let i = 0; i < padding; i++) {
      calendarDays.push(null);
    }
    calendarDays.push(...monthActiveDays);
  }

  const today = new Date();

  const handleClassClick = (classData: Class, date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    onClassClick(classData, dateString);
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
  }[activeWorkingDays.length as keyof typeof gridCols] || 'grid-cols-5';

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100">
          <ChevronLeftIcon className="w-6 h-6 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-blue-800 capitalize">
          {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100">
          <ChevronRightIcon className="w-6 h-6 text-slate-600" />
        </button>
      </div>

      <div className={`grid ${gridCols} gap-1 text-center font-semibold text-slate-500 text-sm mb-2`}>
        {activeWorkingDays.map(day => <div key={day}>{day}</div>)}
      </div>

      <div className={`grid ${gridCols} gap-1 sm:gap-2`}>
        {calendarDays.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="border rounded-lg border-transparent"></div>;

          const dayOfWeekName = dayIndexToName[day.getDay()];
          const classesForDay = schedule[dayOfWeekName] || [];
          const isToday = day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
          const dateString = day.toISOString().split('T')[0];
          const holiday = isDateNonWorking(day, nonWorkingDays);

          return (
            <div
              key={day.toISOString()}
              className={`border rounded-lg p-2 min-h-[120px] flex flex-col ${isToday ? 'border-blue-500 bg-blue-50' : holiday ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-white'}`}
            >
              <span className={`font-semibold mb-1 ${isToday ? 'text-blue-700' : holiday ? 'text-orange-700' : 'text-slate-600'}`}>
                {day.getDate()}
              </span>
              <div className="space-y-1 overflow-y-auto text-xs flex-grow">
                {holiday ? (
                  <div className="h-full flex flex-col justify-center items-center text-center">
                    <span className="text-orange-600 font-medium text-[10px] leading-tight">{holiday.description}</span>
                  </div>
                ) : (
                  classesForDay.map(classItem => {
                    const absentStudentIds = new Set((classItem.absences ?? []).filter(a => a.date === dateString).map(a => a.studentId));
                    const permanentStudentIds = new Set(
                      classItem.bookings
                        .filter(b => b.startDate <= dateString)
                        .map(b => b.studentId)
                        .filter(id => !absentStudentIds.has(id))
                    );
                    const oneTimeStudentIds = new Set((classItem.oneTimeBookings ?? []).filter(b => b.date === dateString).map(b => b.studentId));
                    const allPresentIds = new Set([...permanentStudentIds, ...oneTimeStudentIds]);
                    const occupancy = allPresentIds.size;
                    const occupancyColor = occupancy === MAX_CAPACITY ? 'bg-red-200 text-red-800' : occupancy > 0 ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-700';
                    return (
                      <div
                        key={classItem.id}
                        onClick={() => handleClassClick(classItem, day)}
                        className={`p-1 rounded-md cursor-pointer hover:opacity-80 ${occupancyColor}`}
                      >
                        <div className="font-semibold">{classItem.time}:00</div>
                        <div className="flex items-center justify-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span>{occupancy}/{MAX_CAPACITY}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarPage;