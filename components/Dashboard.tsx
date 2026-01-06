import React, { useState, useEffect } from 'react';
import { UserButton, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { Student, Schedule, Class, Booking, PaymentRecord, PlanCosts, NonWorkingDay, ScheduleConfig } from '../types';
import { initialPlanCosts } from '../dev-data';
import { MAX_CAPACITY, DAY_CODE_MAP } from '../constants';
import {
    loadDataFromSheet,
    updateMonthlySheet,
    assignStudentToClassRecurring,
    removeStudentFromClassRecurring,
    registerStudentAbsence,
    assignStudentToClassSingleDay,
    updatePaymentStatus,
    loadPlanCosts,
    savePlanCosts,
    loadWorkingDays,
    saveWorkingDays,
    createStudent,
    updateStudent,
    deleteStudent,
    loadNonWorkingDays,
    addNonWorkingDay,
    deleteNonWorkingDay,
    removeStudentFromAllFutureClasses,
    setUserEmail,
    loadScheduleConfig,
    saveScheduleConfig
} from '../services/googleSheetsService';

import Header from './Header';
import ScheduleView from './ScheduleView';
import StudentFormModal from './StudentFormModal';
import ClassDetailModal from './ClassDetailModal';
import AssignClassModal from './AssignClassModal';
import AssignStudentModal from './AssignStudentModal';
import CalendarPage from './CalendarPage';
import StudentManagementPage from './StudentManagementPage';
import PaymentsPage from './PaymentsPage';
import SettingsPage from './SettingsPage';

type View = 'schedule' | 'calendar' | 'students' | 'payments' | 'settings';

const Dashboard: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [schedule, setSchedule] = useState<Schedule>({});
    const [payments, setPayments] = useState<PaymentRecord>({});
    const [planCosts, setPlanCosts] = useState<PlanCosts>(initialPlanCosts);
    const [nonWorkingDays, setNonWorkingDays] = useState<NonWorkingDay[]>([]);

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
    const [activeYear, setActiveYear] = useState(new Date().getFullYear().toString());
    const [workingDays, setWorkingDays] = useState<string[]>(['L', 'M', 'X', 'J', 'V']);
    const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (isLoaded && user && user.primaryEmailAddress) {
            setUserEmail(user.primaryEmailAddress.emailAddress);
            fetchData(activeYear);
        }
    }, [isLoaded, user, activeYear]);

    const fetchData = async (year: string) => {
        setLoading(true);
        setError(null);
        try {
            const { students, schedule, payments } = await loadDataFromSheet(year);
            setStudents(students);
            setSchedule(schedule);
            setPayments(payments);

            // Load plan costs
            const loadedCosts = await loadPlanCosts();
            if (loadedCosts) {
                setPlanCosts(loadedCosts);
            }

            // Load working days
            const loadedWorkingDays = await loadWorkingDays();
            if (loadedWorkingDays) {
                setWorkingDays(loadedWorkingDays);
            }

            // Update the monthly sheet
            const now = new Date();
            const monthToUse = (now.getFullYear().toString() === year) ? String(now.getMonth() + 1).padStart(2, '0') : '01';
            const monthYear = `${year}-${monthToUse}`;
            await updateMonthlySheet(schedule, students, monthYear, loadedWorkingDays || workingDays);

            // Load schedule config
            const loadedScheduleConfig = await loadScheduleConfig();
            if (loadedScheduleConfig) {
                setScheduleConfig(loadedScheduleConfig);
                // Sync workingDays with config keys
                const daysFromConfig = Object.keys(loadedScheduleConfig)
                    .map(day => {
                        const code = Object.entries(DAY_CODE_MAP).find(([_, name]) => name === day)?.[0];
                        return code;
                    })
                    .filter((c): c is string => !!c)
                    .sort((a, b) => {
                        const order = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
                        return order.indexOf(a) - order.indexOf(b);
                    });

                if (daysFromConfig.length > 0) {
                    setWorkingDays(daysFromConfig);
                }
            }

            // Load non-working days
            const loadedHolidays = await loadNonWorkingDays();
            setNonWorkingDays(loadedHolidays);

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

            if (newDate.getFullYear().toString() !== activeYear) {
                setActiveYear(newDate.getFullYear().toString());
            }

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

    const handleSaveStudent = async (studentData: Student) => {
        setIsSaving(true);
        try {
            const isNewStudent = !students.find(s => s.id === studentData.id);

            if (isNewStudent) {
                // Create new student in Google Sheets
                const createdStudent = await createStudent(studentData);
                setStudents(prev => [...prev, createdStudent]);
            } else {
                // Check if plan changed
                const originalStudent = students.find(s => s.id === studentData.id);
                if (originalStudent && originalStudent.plan !== studentData.plan) {
                    await removeStudentFromAllFutureClasses(studentData.id);

                    // Update local schedule state to reflect removal
                    setSchedule(prevSchedule => {
                        const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
                        for (const day in newSchedule) {
                            newSchedule[day] = newSchedule[day].map((c: Class) => ({
                                ...c,
                                bookings: c.bookings.filter(b => b.studentId !== studentData.id)
                            }));
                        }
                        return newSchedule;
                    });
                }

                // Update existing student in Google Sheets
                await updateStudent(studentData);
                setStudents(prev => {
                    const newStudents = [...prev];
                    const index = newStudents.findIndex(s => s.id === studentData.id);
                    if (index > -1) {
                        newStudents[index] = studentData;
                    }
                    return newStudents;
                });
            }
            setIsStudentFormOpen(false);
        } catch (error: any) {
            console.error('Error saving student:', error);
            alert('Error al guardar la alumna: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (window.confirm('¿Seguro que quieres eliminar a esta alumna? Se cancelarán todas sus clases y se eliminarán sus registros de pago.')) {
            setIsSaving(true);
            try {
                // Mark student as deleted in Google Sheets
                await deleteStudent(studentId);

                // Update local state
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
                    const newPayments = { ...prev };
                    delete newPayments[studentId];
                    return newPayments;
                });
            } catch (error: any) {
                console.error('Error deleting student:', error);
                alert('Error al eliminar la alumna: ' + (error.message || 'Error desconocido'));
            } finally {
                setIsSaving(false);
            }
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

    const handleUnbookStudentPermanently = async (studentId: string, classId: string, date: string) => {
        setIsSaving(true);
        try {
            const monthYear = date.substring(0, 7);
            await removeStudentFromClassRecurring(studentId, classId, monthYear);

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
        } catch (error) {
            console.error("Error removing student permanently:", error);
            alert("Error al desasignar alumna de la clase recurrente. Revisa la consola para más detalles.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnbookStudentForDay = async (studentId: string, classId: string, date: string, withMakeup: boolean) => {
        setIsSaving(true);
        try {
            await registerStudentAbsence(studentId, classId, date, withMakeup);

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
        } catch (error) {
            console.error("Error unbooking student for day:", error);
            alert("Error al desasignar alumna de la clase. Revisa la consola para más detalles.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignStudentPermanently = async (studentId: string, classId: string, startDate: string) => {
        setIsSaving(true);
        try {
            const monthYear = startDate.substring(0, 7);
            await assignStudentToClassRecurring(studentId, classId, monthYear);

            let classToUpdate: Class | null = null;
            const newSchedule = JSON.parse(JSON.stringify(schedule));

            for (const day in newSchedule) {
                const classIndex = newSchedule[day].findIndex((c: Class) => c.id === classId);
                if (classIndex > -1) {
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
        } catch (error) {
            console.error("Error assigning student permanently:", error);
            alert("Error al asignar alumna a la clase recurrente. Revisa la consola para más detalles.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignStudentForDay = async (studentId: string, classId: string, date: string) => {
        setIsSaving(true);
        try {
            await assignStudentToClassSingleDay(studentId, classId, date);

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

            // Update student recovery classes count locally
            setStudents(prevStudents =>
                prevStudents.map(student =>
                    student.id === studentId
                        ? { ...student, clases_recuperacion: Math.max(0, student.clases_recuperacion - 1) }
                        : student
                )
            );

            setIsAssignStudentModalOpen(false);
            setStudentToAssign(null);
            setIsClassDetailOpen(true);
        } catch (error) {
            console.error("Error assigning student for day:", error);
            alert("Error al asignar alumna por el día. Revisa si tiene clases para recuperar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStudentSelectedForAssignment = (student: Student) => {
        setStudentToAssign(student);
        setIsAssignClassOpen(false);
        setIsAssignStudentModalOpen(true);
    };

    const handleMarkPayment = async (studentId: string, monthYear: string, paymentDate: string) => {
        setIsSaving(true);
        try {
            await updatePaymentStatus(studentId, monthYear, paymentDate);
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
        } catch (error) {
            console.error("Error marking payment:", error);
            alert("Error al registrar el pago. Revisa la consola.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUndoPayment = async (studentId: string, monthYear: string) => {
        setIsSaving(true);
        try {
            await updatePaymentStatus(studentId, monthYear, '');
            setPayments(prev => {
                const studentPayments = { ...prev[studentId] };
                if (!studentPayments) return prev;
                delete studentPayments[monthYear];
                return {
                    ...prev,
                    [studentId]: studentPayments
                };
            });
        } catch (error) {
            console.error("Error undoing payment:", error);
            alert("Error al deshacer el pago. Revisa la consola.");
        } finally {
            setIsSaving(false);
        }
    };

    const getStudentBookingsCount = (studentId: string) => {
        let count = 0;
        for (const day in schedule) {
            for (const cls of schedule[day]) {
                if (cls.bookings.some(b => b.studentId === studentId)) {
                    count++;
                }
            }
        }
        return count;
    };

    const handleSavePlanCosts = async (newCosts: PlanCosts) => {
        try {
            await savePlanCosts(newCosts);
            setPlanCosts(newCosts);
        } catch (error) {
            console.error("Error saving plan costs:", error);
            throw error;
        }
    };

    const handleSaveWorkingDays = async (days: string[]) => {
        try {
            await saveWorkingDays(days);
            setWorkingDays(days);
        } catch (error) {
            console.error("Error saving working days:", error);
            throw error;
        }
    };

    const handleSaveScheduleConfig = async (config: ScheduleConfig) => {
        try {
            await saveScheduleConfig(config);
            setScheduleConfig(config);
            // Re-fetch data to apply new schedule
            await fetchData(activeYear);
        } catch (error) {
            console.error("Error saving schedule config:", error);
            throw error;
        }
    };

    const handleAddNonWorkingDay = async (day: Omit<NonWorkingDay, 'id'>) => {
        try {
            const newDay = await addNonWorkingDay(day);
            setNonWorkingDays(prev => [...prev, newDay]);
        } catch (error) {
            console.error("Error adding non-working day:", error);
            throw error;
        }
    };

    const handleDeleteNonWorkingDay = async (id: string) => {
        try {
            await deleteNonWorkingDay(id);
            setNonWorkingDays(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            console.error("Error deleting non-working day:", error);
            throw error;
        }
    };

    const renderContent = () => {
        switch (currentView) {
            case 'schedule':
                return <ScheduleView
                    schedule={schedule}
                    students={students}
                    onClassClick={handleClassClick}
                    currentWeek={currentWeek}
                    onWeekChange={handleWeekChange}
                    nonWorkingDays={nonWorkingDays}
                    onYearChange={setActiveYear}
                    workingDays={workingDays}
                />;
            case 'calendar':
                return <CalendarPage
                    schedule={schedule}
                    students={students}
                    onClassClick={handleClassClick}
                    nonWorkingDays={nonWorkingDays}
                    onYearChange={setActiveYear}
                    workingDays={workingDays}
                />;
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
                    isSaving={isSaving}
                />;
            case 'settings':
                return <SettingsPage
                    planCosts={planCosts}
                    onSave={handleSavePlanCosts}
                    nonWorkingDays={nonWorkingDays}
                    onAddNonWorkingDay={handleAddNonWorkingDay}
                    onDeleteNonWorkingDay={handleDeleteNonWorkingDay}
                    workingDays={workingDays}
                    onSaveWorkingDays={handleSaveWorkingDays}
                    scheduleConfig={scheduleConfig}
                    onSaveScheduleConfig={handleSaveScheduleConfig}
                />;
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
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
                isSaving={isSaving}
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
                isSaving={isSaving}
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
                currentBookingsCount={getStudentBookingsCount(studentToAssign.id)}
                isSaving={isSaving}
            />}
        </div>
    );
};

export default Dashboard;
