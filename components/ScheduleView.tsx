import React from 'react';
import { Schedule, Student, Class, Level } from '../types';
import { MAX_CAPACITY } from '../constants';
import { UserIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface ClassSlotProps {
  classData: Class;
  students: Student[];
  onClick: () => void;
  date: Date;
}

const getLevelBadge = (level: Level) => {
    const styles: Record<Level, string> = {
        [Level.Basico]: "bg-blue-500",
        [Level.Medio]: "bg-green-500",
        [Level.Avanzado]: "bg-purple-500",
    };
    return <span className={`w-2 h-2 rounded-full ${styles[level]}`} title={level}></span>;
}


const ClassSlot: React.FC<ClassSlotProps> = ({ classData, students, onClick, date }) => {
  const dateString = date.toISOString().split('T')[0];
  
  const absentStudentIds = new Set(
    (classData.absences ?? []).filter(a => a.date === dateString).map(a => a.studentId)
  );

  const permanentStudentIds = new Set(
      classData.bookings
          .filter(b => b.startDate <= dateString)
          .map(b => b.studentId)
          .filter(id => !absentStudentIds.has(id))
  );

  const oneTimeStudentIds = new Set(
      (classData.oneTimeBookings ?? []).filter(b => b.date === dateString).map(b => b.studentId)
  );

  const allPresentIds = new Set([...permanentStudentIds, ...oneTimeStudentIds]);

  const bookedStudents = Array.from(allPresentIds)
      .map(id => students.find(s => s.id === id))
      .filter((s): s is Student => !!s)
      .sort((a,b) => a.nombre.localeCompare(b.nombre));

  const occupancy = bookedStudents.length;
  const occupancyRate = occupancy / MAX_CAPACITY;
  
  let bgColor = 'bg-white hover:bg-teal-50';
  if (occupancyRate > 0) bgColor = 'bg-teal-100 hover:bg-teal-200';
  if (occupancyRate === 1) bgColor = 'bg-teal-200 hover:bg-teal-300';
  if (classData.isCancelled) bgColor = 'bg-slate-200 hover:bg-slate-300';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg shadow-sm cursor-pointer transition-all duration-200 border border-slate-200 ${bgColor}`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="font-bold text-slate-700">{classData.time}:00</div>
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <UserIcon className="w-4 h-4" />
          <span>{occupancy}/{MAX_CAPACITY}</span>
        </div>
      </div>
      {classData.isCancelled ? (
        <div className="text-center text-red-600 font-semibold text-sm mt-2">CANCELADA</div>
      ) : (
        <div className="space-y-1">
          {bookedStudents.length > 0 ? (
            bookedStudents.map(student => (
              <div key={student.id} className="flex items-center gap-2 text-sm text-slate-800">
                {getLevelBadge(student.nivel)}
                <span>{student.nombre}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-400 italic">Clase vacía</div>
          )}
        </div>
      )}
    </div>
  );
};


const dayIndexToName: { [key: number]: string } = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo',
};

const getWeekInfo = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekDates: Date[] = [];
    for (let i = 0; i < 5; i++) { // Monday to Friday
        const weekDay = new Date(startOfWeek);
        weekDay.setDate(startOfWeek.getDate() + i);
        weekDates.push(weekDay);
    }
    
    const endOfWeek = weekDates[4];

    const startMonth = startOfWeek.toLocaleString('es-ES', { month: 'long' });
    const endMonth = endOfWeek.toLocaleString('es-ES', { month: 'long' });
    const year = endOfWeek.getFullYear();

    let rangeString;
    if (startMonth === endMonth) {
      rangeString = `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${endMonth} de ${year}`;
    } else {
      rangeString = `${startOfWeek.getDate()} de ${startMonth} - ${endOfWeek.getDate()} de ${endMonth} de ${year}`;
    }

    return { weekDates, rangeString };
};

interface ScheduleViewProps {
  schedule: Schedule;
  students: Student[];
  onClassClick: (classData: Class, date: string) => void;
  currentWeek: Date;
  onWeekChange: (direction: 'next' | 'prev') => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, students, onClassClick, currentWeek, onWeekChange }) => {
  const { weekDates, rangeString } = getWeekInfo(currentWeek);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => onWeekChange('prev')} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeftIcon className="w-6 h-6 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-teal-800 text-center">
          {rangeString}
        </h2>
        <button onClick={() => onWeekChange('next')} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronRightIcon className="w-6 h-6 text-slate-600" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {weekDates.map(date => {
          const dayName = dayIndexToName[date.getDay()];
          const classesForDay = schedule[dayName] || [];

          return (
            <div key={date.toISOString()} className="space-y-4">
              <h2 className="text-center font-bold text-lg text-teal-800">
                {dayName} <span className="font-normal text-base text-slate-500">{date.getDate()}</span>
              </h2>
              <div className="space-y-3">
                {classesForDay.map(classData => (
                  <ClassSlot 
                    key={classData.id} 
                    classData={classData} 
                    students={students}
                    date={date}
                    onClick={() => onClassClick(classData, date.toISOString().split('T')[0])} 
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default ScheduleView;