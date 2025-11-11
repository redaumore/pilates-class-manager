import { Student, Schedule, PaymentRecord, Level, Plan } from '../types';
import { generateInitialSchedule } from '../constants';

const SPREADSHEET_ID = '1onA2BHky-848DFSbaeTa_Qw-r8ZwpZ9nJteIn8-d1cc';
const SHEET_NAME = '2025';

const LEVEL_MAP: Record<string, Level> = {
  'B': Level.Basico,
  'M': Level.Medio,
  'A': Level.Avanzado,
};

const DAY_MAP: Record<string, string> = {
    'L': 'Lunes',
    'M': 'Martes',
    'X': 'Miércoles',
    'J': 'Jueves',
    'V': 'Viernes',
};

const MONTH_MAP: Record<string, string> = {
    'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12',
};

// Helper to parse date from DD/MM/YYYY to YYYY-MM-DD
const parseDate = (dateString: string): string => {
    if (!dateString || !dateString.includes('/')) return dateString;
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString;
    const [day, month, year] = parts;
    return `${year.length === 2 ? '20' + year : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const loadDataFromSheet = async (): Promise<{ students: Student[], schedule: Schedule, payments: PaymentRecord }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("No se ha seleccionado una clave de API. Por favor, selecciona una para continuar.");
    }
    
    const URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:W?key=${apiKey}`;

    const response = await fetch(URL);
    if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.error?.message || 'Error desconocido al acceder a Google Sheets.';
        throw new Error(`Failed to fetch data from Google Sheet: ${message}`);
    }
    const data = await response.json();
    const rows: string[][] = data.values;

    if (!rows || rows.length < 2) {
        return { students: [], schedule: generateInitialSchedule(), payments: {} };
    }

    const header = rows[0];
    const headerMap = header.reduce((acc, col, i) => {
        acc[col.trim()] = i;
        return acc;
    }, {} as Record<string, number>);

    const students: Student[] = [];
    const schedule: Schedule = generateInitialSchedule();
    const payments: PaymentRecord = {};

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        const getVal = (colName: string) => row[headerMap[colName]]?.trim() || '';

        if (getVal('ESTADO') !== 'OK') {
            continue;
        }

        const studentId = getVal('ID');
        if (!studentId) continue;

        const student: Student = {
            id: studentId,
            nombre: getVal('NOMBRE'),
            apellido: getVal('APELLIDO'),
            telefono: `54911${getVal('TELEFONO')}`,
            nivel: LEVEL_MAP[getVal('NIVEL')] || Level.Basico,
            fecha_inscripcion: parseDate(getVal('INGRESO')),
            plan: parseInt(getVal('PLAN'), 10) as Plan || 1,
            clases_recuperacion: parseInt(getVal('RECUPERAR'), 10) || 0,
        };
        students.push(student);

        payments[studentId] = {};
        for (const monthAbbr in MONTH_MAP) {
            const paymentDate = getVal(monthAbbr);
            if (paymentDate) {
                const monthYear = `${SHEET_NAME}-${MONTH_MAP[monthAbbr]}`;
                payments[studentId][monthYear] = parseDate(paymentDate);
            }
        }

        const classKeys = ['CLASE 1', 'CLASE 2', 'CLASE 3'];
        for (const classKey of classKeys) {
            const classCode = getVal(classKey); // e.g., 'X18'
            if (classCode) {
                const dayLetter = classCode.charAt(0).toUpperCase();
                const time = parseInt(classCode.substring(1), 10);
                const dayName = DAY_MAP[dayLetter];
                
                if (dayName && !isNaN(time) && schedule[dayName]) {
                    const classToBook = schedule[dayName].find(c => c.time === time);
                    if (classToBook) {
                        if (!classToBook.bookings.some(b => b.studentId === studentId)) {
                            classToBook.bookings.push({
                                studentId: studentId,
                                classId: classToBook.id,
                                startDate: student.fecha_inscripcion,
                            });
                        }
                    }
                }
            }
        }
    }
    
    return { students, schedule, payments };
};
