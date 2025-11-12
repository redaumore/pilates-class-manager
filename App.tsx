import React, { useState, useEffect } from 'react';
import { Student, Schedule, Class, Booking, PaymentRecord, PlanCosts } from './types';
import { initialPlanCosts } from './dev-data';
import { MAX_CAPACITY } from './constants';
import { loadDataFromSheet, initGapi, initGIS, signIn, isSignedIn } from './services/googleSheetsService';

import Header from './components/Header';
import ScheduleView from './components/ScheduleView';
import StudentFormModal from './components/StudentFormModal';
import ClassDetailModal from './components/ClassDetailModal';
import AssignClassModal from './components/AssignClassModal';
import AssignStudentModal from './components/AssignStudentModal';
import CalendarPage from './components/CalendarPage';
import StudentManagementPage from './components/StudentManagementPage';
import PaymentsPage from './components/PaymentsPage';
import SettingsPage from './components/SettingsPage';

type View = 'schedule' | 'calendar' | 'students' | 'payments' | 'settings';

const App: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [schedule, setSchedule] = useState<Schedule>({});
    const [payments, setPayments] = useState<PaymentRecord>({});
    const [planCosts, setPlanCosts] = useState<PlanCosts>(initialPlanCosts);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
    const [isClassDetailOpen, setIsClassDetailOpen] = useState(false);
    const [isAssignClassOpen, setIsAssignClassOpen] = useState(false);
    const [isAssignStudentModalOpen, setIsAssignStudentModalOpen] = useState(false);

    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [studentToAssign, setStudentToAssign] = useState<Student | null>(null);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
    const [currentView, setCurrentView] = useState<View>('schedule');
    const [currentWeek, setCurrentWeek] = useState(new Date());

    useEffect(() => {
        const loadGoogleAPI = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Verificar que CLIENT_ID esté configurado
                if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                    throw new Error('VITE_GOOGLE_CLIENT_ID no está configurado en .env.local');
                }
                
                // Cargar el script de gapi
                const gapiScript = document.createElement('script');
                gapiScript.src = 'https://apis.google.com/js/api.js';
                gapiScript.async = true;
                gapiScript.defer = true;
                
                await new Promise<void>((resolve, reject) => {
                    gapiScript.onload = () => resolve();
                    gapiScript.onerror = () => reject(new Error('No se pudo cargar el script de Google API'));
                    document.head.appendChild(gapiScript);
                });
                
                // Cargar el script de Google Identity Services
                const gisScript = document.createElement('script');
                gisScript.src = 'https://accounts.google.com/gsi/client';
                gisScript.async = true;
                gisScript.defer = true;
                
                await new Promise<void>((resolve, reject) => {
                    gisScript.onload = () => resolve();
                    gisScript.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
                    document.head.appendChild(gisScript);
                });
                
                // Inicializar gapi (solo client, no auth)
                await initGapi();
                
                // Inicializar Google Identity Services
                await initGIS();
                
                // Verificar si ya está autenticado
                if (!isSignedIn()) {
                    console.log('Usuario no autenticado, iniciando flujo de login...');
                    await signIn();
                }
                
                // Cargar datos
                await fetchData();
                
            } catch (err: any) {
                console.error('Error completo:', err);
                setError(err.message || 'Error desconocido al inicializar la aplicación');
                setLoading(false);
            }
        };
        
        loadGoogleAPI();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const { students, schedule, payments } = await loadDataFromSheet();
            setStudents(students);
            setSchedule(schedule);
            setPayments(payments);
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error desconocido.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleWeekChange = (direction: 'next' | 'prev') => {
        setCurrentWeek(prev => {
            const newDate = new Date(prev);
            const dayIncrement = direction === 'next' ? 7 : -7;
            newDate.setDate(newDate.getDate() + dayIncrement);
            return newDate;
        });
    };

    const handleAddStudentClick = () => {
        setStudentToEdit(null);
        setIsStudentFormOpen(true);
    };

    const handleEditStudentClick = (student: Student) => {
        setStudentToEdit(student);
        setIsStudentFormOpen(true);
    };

    const handleSaveStudent = (studentData: Student) => {
        setStudents(prev => {
            const index = prev.findIndex(s => s.id === studentData.id);
            if (index > -1) {
                const newStudents = [...prev];
                newStudents[index] = studentData;
                return newStudents;
            }
            return [...prev, studentData];
        });
        setIsStudentFormOpen(false);
    };

    const handleDeleteStudent = (studentId: string) => {
        if (window.confirm('¿Seguro que quieres eliminar a esta alumna? Se cancelarán todas sus clases y se eliminarán sus registros de pago.')) {
            setStudents(prev => prev.filter(s => s.id !== studentId));
            setSchedule(prevSchedule => {
                const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
                for (const day in newSchedule) {
                    newSchedule[day] = newSchedule[day].map((c: Class) => ({
                        ...c,
                        bookings: c.bookings.filter(b => b.studentId !== studentId)
                    }));
                }
                return newSchedule;
            });
            setPayments(prev => {
                const newPayments = {...prev};
                delete newPayments[studentId];
                return newPayments;
            });
        }
    };
    
    const handleClassClick = (classData: Class, date?: string) => {
        setSelectedClass(classData);
        setSelectedDate(date);
        setIsClassDetailOpen(true);
    };
    
    const handleToggleCancelClass = (classId: string) => {
         setSchedule(prevSchedule => {
            const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
            for (const day in newSchedule) {
                newSchedule[day] = newSchedule[day].map((c: Class) => {
                    if (c.id === classId) {
                        return { ...c, isCancelled: !c.isCancelled };
                    }
                    return c;
                });
            }
            return newSchedule;
        });
        setSelectedClass(prev => prev && prev.id === classId ? { ...prev, isCancelled: !prev.isCancelled } : prev);
    };
    
    const handleUnbookStudentPermanently = (studentId: string, classId: string, date: string) => {
        setSchedule(prevSchedule => {
            const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
            let classToUpdate: Class | null = null;
    
            for (const day in newSchedule) {
                const classIndex = newSchedule[day].findIndex((c: Class) => c.id === classId);
                if (classIndex !== -1) {
                    const oldClass = newSchedule[day][classIndex];
                    
                    const initialPermanentBookingsCount = oldClass.bookings.length;
                    const newPermanentBookings = oldClass.bookings.filter(b => b.studentId !== studentId);
                    
                    let newClass: Class;
    
                    if (newPermanentBookings.length < initialPermanentBookingsCount) {
                         newClass = {
                            ...oldClass,
                            bookings: newPermanentBookings,
                        };
                    } else {
                        const newOneTimeBookings = (oldClass.oneTimeBookings || []).filter(
                            b => !(b.studentId === studentId && b.date === date)
                        );
                        newClass = {
                            ...oldClass,
                            oneTimeBookings: newOneTimeBookings,
                        };
                    }
    
                    newSchedule[day][classIndex] = newClass;
                    classToUpdate = newClass;
                    break; 
                }
            }
            
            if (classToUpdate) {
                setSelectedClass(classToUpdate);
            }
            
            return newSchedule;
        });
    };
    
    const handleUnbookStudentForDay = (studentId: string, classId: string, date: string, withMakeup: boolean) => {
       setSchedule(prevSchedule => {
            const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
            let classToUpdate: Class | null = null;
    
            for (const day in newSchedule) {
                const classIndex = newSchedule[day].findIndex((c: Class) => c.id === classId);
                if (classIndex !== -1) {
                    const oldClass = newSchedule[day][classIndex];
                    
                    const hasPermanentBooking = oldClass.bookings.some(b => b.studentId === studentId);
                    
                    let newClass: Class;
    
                    if (hasPermanentBooking) {
                        const newAbsences = oldClass.absences ? [...oldClass.absences] : [];
                        if (!newAbsences.some(a => a.studentId === studentId && a.date === date)) {
                            newAbsences.push({ studentId, date });
                        }
                        newClass = {
                            ...oldClass,
                            absences: newAbsences,
                        };
                    } else {
                        const newOneTimeBookings = (oldClass.oneTimeBookings || []).filter(
                            b => !(b.studentId === studentId && b.date === date)
                        );
                        newClass = {
                            ...oldClass,
                            oneTimeBookings: newOneTimeBookings,
                        };
                    }
    
                    newSchedule[day][classIndex] = newClass;
                    classToUpdate = newClass;
                    break;
                }
            }
            
            if (classToUpdate) {
                setSelectedClass(classToUpdate);
            }
            
            return newSchedule;
        });

        if (withMakeup) {
            setStudents(prevStudents => 
                prevStudents.map(student => 
                    student.id === studentId 
                        ? { ...student, clases_recuperacion: student.clases_recuperacion + 1 }
                        : student
                )
            );
        }
    };

    const handleAssignStudentPermanently = (studentId: string, classId: string, startDate: string) => {
        let classToUpdate: Class | null = null;
        const newSchedule = JSON.parse(JSON.stringify(schedule));
        
        for (const day in newSchedule) {
            const classIndex = newSchedule[day].findIndex((c: Class) => c.id === classId);
            if(classIndex > -1) {
                const foundClass = newSchedule[day][classIndex];
                if (foundClass.bookings.length < MAX_CAPACITY) {
                    const newBooking: Booking = { studentId, classId, startDate };
                    foundClass.bookings.push(newBooking);
                    classToUpdate = foundClass;
                }
                break;
            }
        }
        
        if (classToUpdate) {
            setSchedule(newSchedule);
            setSelectedClass(classToUpdate);
        }

        setIsAssignStudentModalOpen(false);
        setStudentToAssign(null);
        setIsClassDetailOpen(true);
    };

    const handleAssignStudentForDay = (studentId: string, classId: string, date: string) => {
        let classToUpdate: Class | null = null;
        const newSchedule = JSON.parse(JSON.stringify(schedule));

        for (const day in newSchedule) {
            const classIndex = newSchedule[day].findIndex((c: Class) => c.id === classId);
            if (classIndex > -1) {
                const c = newSchedule[day][classIndex];
                if (!c.oneTimeBookings) c.oneTimeBookings = [];
                if (!c.oneTimeBookings.some(b => b.studentId === studentId && b.date === date)) {
                    c.oneTimeBookings.push({ studentId, date });
                }
                classToUpdate = c;
                break;
            }
        }
        
        if (classToUpdate) {
            setSchedule(newSchedule);
            setSelectedClass(classToUpdate);
        }

        setIsAssignStudentModalOpen(false);
        setStudentToAssign(null);
        setIsClassDetailOpen(true);
    };

    const handleStudentSelectedForAssignment = (student: Student) => {
        setStudentToAssign(student);
        setIsAssignClassOpen(false);
        setIsAssignStudentModalOpen(true);
    };

    const handleMarkPayment = (studentId: string, monthYear: string, paymentDate: string) => {
        setPayments(prev => {
            const studentPayments = prev[studentId] || {};
            return {
                ...prev,
                [studentId]: {
                    ...studentPayments,
                    [monthYear]: paymentDate
                }
            };
        });
    };

    const handleUndoPayment = (studentId: string, monthYear: string) => {
        setPayments(prev => {
            const studentPayments = { ...prev[studentId] };
            if (!studentPayments) return prev;
            delete studentPayments[monthYear];
            return {
                ...prev,
                [studentId]: studentPayments
            };
        });
    };

    const handleSavePlanCosts = (newCosts: PlanCosts) => {
        setPlanCosts(newCosts);
    };

    const renderContent = () => {
        switch(currentView) {
            case 'schedule':
                return <ScheduleView 
                    schedule={schedule} 
                    students={students} 
                    onClassClick={handleClassClick}
                    currentWeek={currentWeek}
                    onWeekChange={handleWeekChange}
                />;
            case 'calendar':
                return <CalendarPage schedule={schedule} students={students} onClassClick={handleClassClick} />;
            case 'students':
                return <StudentManagementPage
                    students={students}
                    onAddStudent={handleAddStudentClick}
                    onEditStudent={handleEditStudentClick}
                    onDeleteStudent={handleDeleteStudent}
                />;
            case 'payments':
                return <PaymentsPage 
                    students={students}
                    payments={payments}
                    planCosts={planCosts}
                    onMarkPayment={handleMarkPayment}
                    onUndoPayment={handleUndoPayment}
                />;
            case 'settings':
                return <SettingsPage 
                    planCosts={planCosts}
                    onSave={handleSavePlanCosts}
                />;
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold text-slate-700">Cargando datos desde la planilla...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-red-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md w-full">
                    <h2 className="text-2xl font-bold text-red-700 mb-4">Error al Cargar Datos</h2>
                    <p className="text-slate-600 mb-6">No se pudo conectar con la planilla de Google. Verifica tu configuración.</p>
                    <pre className="bg-slate-100 p-4 rounded-lg text-left text-sm text-red-800 overflow-x-auto">
                        <code>{error}</code>
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <Header 
                currentView={currentView}
                onNavigate={setCurrentView}
            />

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
              {renderContent()}
            </main>
            
            <StudentFormModal
                isOpen={isStudentFormOpen}
                onClose={() => setIsStudentFormOpen(false)}
                onSave={handleSaveStudent}
                studentToEdit={studentToEdit}
            />

            {selectedClass && <ClassDetailModal
                isOpen={isClassDetailOpen}
                onClose={() => setIsClassDetailOpen(false)}
                classData={selectedClass}
                date={selectedDate}
                allStudents={students}
                onUnbook={handleUnbookStudentPermanently}
                onUnbookForDay={handleUnbookStudentForDay}
                onToggleCancel={handleToggleCancelClass}
                onAddStudent={() => {
                    setIsClassDetailOpen(false);
                    setIsAssignClassOpen(true);
                }}
            />}

            {selectedClass && selectedDate && <AssignClassModal
                isOpen={isAssignClassOpen}
                onClose={() => {
                    setIsAssignClassOpen(false);
                    setIsClassDetailOpen(true);
                }}
                onStudentSelected={handleStudentSelectedForAssignment}
                classData={selectedClass}
                allStudents={students}
                date={selectedDate}
            />}

            {selectedClass && studentToAssign && selectedDate && <AssignStudentModal
                isOpen={isAssignStudentModalOpen}
                onClose={() => {
                    setIsAssignStudentModalOpen(false);
                    setStudentToAssign(null);
                    setIsClassDetailOpen(true);
                }}
                student={studentToAssign}
                classData={selectedClass}
                onAssignPermanently={() => handleAssignStudentPermanently(studentToAssign.id, selectedClass.id, selectedDate)}
                onAssignForDay={() => handleAssignStudentForDay(studentToAssign.id, selectedClass.id, selectedDate)}
            />}
        </div>
    );
};

export default App;