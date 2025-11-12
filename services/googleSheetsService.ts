import { Student, Schedule, PaymentRecord, Level, Plan } from '../types';
import { generateInitialSchedule } from '../constants';

// Declarar gapi y google globalmente
declare const gapi: any;
declare const google: any;

const SPREADSHEET_ID = '1onA2BHky-848DFSbaeTa_Qw-r8ZwpZ9nJteIn8-d1cc';
const SHEET_NAME = '2025';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// Variable para almacenar el token de acceso
let accessToken: string | null = null;

const LEVEL_MAP: Record<string, Level> = {
  B: Level.Basico,
  M: Level.Medio,
  A: Level.Avanzado,
};

const DAY_MAP: Record<string, string> = {
  L: 'Lunes',
  M: 'Martes',
  X: 'Miércoles',
  J: 'Jueves',
  V: 'Viernes',
};

const MONTH_MAP: Record<string, string> = {
  ENE: '01',
  FEB: '02',
  MAR: '03',
  ABR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AGO: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DIC: '12',
};

// Helper to parse date from DD/MM/YYYY to YYYY-MM-DD
const parseDate = (dateString: string): string => {
  if (!dateString || !dateString.includes('/')) return dateString;
  const parts = dateString.split('/');
  if (parts.length !== 3) return dateString;
  const [day, month, year] = parts;
  return `${year.length === 2 ? '20' + year : year}-${month.padStart(
    2,
    '0'
  )}-${day.padStart(2, '0')}`;
};

// Verificar que gapi esté cargado
const waitForGapi = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50;
    let attempts = 0;

    const checkGapi = () => {
      attempts++;
      if (typeof gapi !== 'undefined') {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(
          new Error(
            'gapi no se cargó correctamente. Verifica tu conexión a internet.'
          )
        );
      } else {
        setTimeout(checkGapi, 100);
      }
    };

    checkGapi();
  });
};

// Verificar que Google Identity Services esté cargado
const waitForGIS = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50;
    let attempts = 0;

    const checkGIS = () => {
      attempts++;
      if (typeof google !== 'undefined' && google.accounts) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(
          new Error('Google Identity Services no se cargó correctamente.')
        );
      } else {
        setTimeout(checkGIS, 100);
      }
    };

    checkGIS();
  });
};

// Inicializar gapi client (solo para API calls, no auth)
export const initGapi = async (): Promise<void> => {
  await waitForGapi();

  return new Promise<void>((resolve, reject) => {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          discoveryDocs: [
            'https://sheets.googleapis.com/$discovery/rest?version=v4',
          ],
        });

        console.log('gapi.client inicializado correctamente');
        resolve();
      } catch (err: any) {
        console.error('Error al inicializar gapi.client:', err);
        reject(
          new Error(
            'Error al inicializar Google API: ' + (err.details || err.message)
          )
        );
      }
    });
  });
};

// Inicializar Google Identity Services para autenticación
export const initGIS = async (): Promise<void> => {
  await waitForGIS();
  console.log('Google Identity Services cargado correctamente');
};

// Función para autenticar usando Google Identity Services
export const signIn = async (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error('Error al autenticar: ' + response.error));
            return;
          }
          accessToken = response.access_token;
          console.log('Autenticación exitosa');
          resolve();
        },
      });

      client.requestAccessToken();
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      reject(new Error('Error al iniciar sesión: ' + err.message));
    }
  });
};

// Función para verificar si está autenticado
export const isSignedIn = (): boolean => {
  return accessToken !== null;
};

// Función para leer datos con el token de acceso
export const loadDataFromSheet = async (): Promise<{
  students: Student[];
  schedule: Schedule;
  payments: PaymentRecord;
}> => {
  try {
    // Configurar el token de acceso para las llamadas a la API
    gapi.client.setToken({ access_token: accessToken });

    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:W`,
    });

    const rows: string[][] = response.result.values;

    if (!rows || rows.length < 2) {
      return {
        students: [],
        schedule: generateInitialSchedule(),
        payments: {},
      };
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

      if (getVal('ESTADO') !== 'OK') continue;

      const studentId = getVal('ID');
      if (!studentId) continue;

      const student: Student = {
        id: studentId,
        nombre: getVal('NOMBRE'),
        apellido: getVal('APELLIDO'),
        telefono: `54911${getVal('TELEFONO')}`,
        nivel: LEVEL_MAP[getVal('NIVEL')] || Level.Basico,
        fecha_inscripcion: parseDate(getVal('INGRESO')),
        plan: (parseInt(getVal('PLAN'), 10) as Plan) || 1,
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
        const classCode = getVal(classKey);
        if (classCode) {
          const dayLetter = classCode.charAt(0).toUpperCase();
          const time = parseInt(classCode.substring(1), 10);
          const dayName = DAY_MAP[dayLetter];

          if (dayName && !isNaN(time) && schedule[dayName]) {
            const classToBook = schedule[dayName].find((c) => c.time === time);
            if (
              classToBook &&
              !classToBook.bookings.some((b) => b.studentId === studentId)
            ) {
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

    return { students, schedule, payments };
  } catch (err: any) {
    console.error('Error al cargar datos:', err);
    throw new Error(
      'Error al cargar datos de Google Sheets: ' +
        (err.result?.error?.message || err.message)
    );
  }
};

// Función para guardar datos (ejemplo para actualizar una celda)
export const updateSheet = async (range: string, values: string[][]) => {
  await gapi.client.load('sheets', 'v4');
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: range,
    valueInputOption: 'RAW',
    resource: { values },
  });
};

// Ejemplo de función para guardar un estudiante (adapta según necesidades)
export const saveStudentToSheet = async (student: Student) => {
  // Lógica para convertir student a filas y actualizar la planilla
  // Por ejemplo, encontrar la fila del estudiante y actualizar
  const range = `${SHEET_NAME}!A2:W`; // Ajusta según la estructura
  const values = [
    [student.id, student.nombre, student.apellido /* ... otros campos */],
  ];
  await updateSheet(range, values);
};
