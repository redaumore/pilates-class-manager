import React, { useState, useEffect } from 'react';
import { Student, Schedule, Class, Booking, PaymentRecord, PlanCosts } from './types';
import { initialPlanCosts } from './dev-data';
import { MAX_CAPACITY } from './constants';
import { loadDataFromSheet } from './services/googleSheetsService';

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
    const [apiKeyReady, setApiKeyReady] = useState(false);
    
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
        const checkApiKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (hasKey) {
                    setApiKeyReady(true);
                } else {
                    setLoading(false); // Stop loading if no key, wait for user action
                }
            } else {
                setError("El entorno de aistudio no está disponible.");
                setLoading(false);
            }
        };
        checkApiKey();
    }, []);

    useEffect(() => {
        if (!apiKeyReady) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { students, schedule, payments } = await loadDataFromSheet();
                setStudents(students);
                setSchedule(schedule);
                setPayments(payments);
            } catch (err: any) {
                const errorMessage = (err.message || '').toLowerCase();
                // Check for common API key / permission errors from Google Sheets API
                if (
                    errorMessage.includes('api key not valid') ||
                    errorMessage.includes('does not have permission') ||
                    errorMessage.includes('api has not been used')
                ) {
                    setApiKeyReady(false); // Reset to show the selection screen again
                    setError('La clave de API no es válida, no tiene los permisos necesarios o la API de Google Sheets no está habilitada en su proyecto. Por favor, selecciona una clave diferente y asegúrate de que esté configurada correctamente.');
                } else {
                     setError(err.message || 'Ocurrió un error desconocido.');
                }
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiKeyReady]);


    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        // After the dialog closes, assume a key was selected and try to fetch data.
        setApiKeyReady(true);
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

    if (!apiKeyReady && !loading) {
         return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md w-full">
                    <h2 className="text-2xl font-bold text-teal-700 mb-4">Conectar con Google Sheets</h2>
                    <p className="text-slate-600 mb-6">
                        Esta aplicación necesita acceso a Google Sheets para cargar los datos. 
                        Por favor, selecciona una clave de API que tenga permisos para leer la planilla.
                    </p>
                    {error && (
                        <p className="bg-red-100 p-3 rounded-lg text-sm text-red-800 mb-4 text-left">
                            <strong>Error:</strong> {error}
                        </p>
                    )}
                    <button
                        onClick={handleSelectKey}
                        className="w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-200"
                    >
                        Seleccionar Clave de API
                    </button>
                </div>
            </div>
        );
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
                    <p className="text-slate-600 mb-6">No se pudo conectar con la planilla de Google. Por favor, verifica tu conexión o la configuración de la planilla.</p>
                    <pre className="bg-slate-100 p-4 rounded-lg text-left text-sm text-red-800 overflow-x-auto">
                        <code>{error}</code>
                    </pre>
                     <button
                        onClick={() => setApiKeyReady(false)} // Go back to key selection
                        className="mt-6 w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    >
                        Intentar con otra Clave
                    </button>
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