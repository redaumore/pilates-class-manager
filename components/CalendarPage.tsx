import React, { useState } from 'react';
import { Schedule, Student, Class } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon } from './icons';
import { MAX_CAPACITY } from '../constants';

// Mapping from JS getDay() index (Sun=0) to our schedule keys
const dayIndexToName: { [key: number]: string } = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
};

const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V'];

interface CalendarPageProps {
  schedule: Schedule;
  students: Student[];
  onClassClick: (classData: Class, date: string) => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ schedule, students, onClassClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(1); // Avoid month skipping issues
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthWeekdays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i);
    const dayOfWeek = day.getDay();
    // Only include weekdays (Monday=1 to Friday=5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      monthWeekdays.push(day);
    }
  }

  const calendarDays = [];
  if (monthWeekdays.length > 0) {
    const firstDayOfWeek = monthWeekdays[0].getDay(); // 1 for Monday
    const padding = firstDayOfWeek - 1;
    for (let i = 0; i < padding; i++) {
        calendarDays.push(null);
    }
    calendarDays.push(...monthWeekdays);
  }

  const today = new Date();

  const handleClassClick = (classData: Class, date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    onClassClick(classData, dateString);
  };

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

      <div className="grid grid-cols-5 gap-1 text-center font-semibold text-slate-500 text-sm mb-2">
        {WEEK_DAYS.map(day => <div key={day}>{day}</div>)}
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="border rounded-lg border-transparent"></div>;

          const dayOfWeekName = dayIndexToName[day.getDay()];
          const classesForDay = schedule[dayOfWeekName] || [];
          const isToday = day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
          const dateString = day.toISOString().split('T')[0];

          return (
            <div
              key={day.toISOString()}
              className={`border rounded-lg p-2 min-h-[120px] flex flex-col ${isToday ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <span className={`font-semibold mb-1 ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>
                {day.getDate()}
              </span>
              <div className="space-y-1 overflow-y-auto text-xs">
                {classesForDay.map(classItem => {
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
                          <UserIcon className="w-3 h-3"/>
                          <span>{occupancy}/{MAX_CAPACITY}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarPage;