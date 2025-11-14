import { Student, Schedule, PaymentRecord, Level, Plan } from '../types';
import { generateInitialSchedule } from '../constants';

// Declarar gapi y google globalmente
declare const gapi: any;
declare const google: any;

const SPREADSHEET_ID = '1onA2BHky-848DFSbaeTa_Qw-r8ZwpZ9nJteIn8-d1cc';
const SHEET_NAME = '2025';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

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

const DAY_MAP_REVERSE: Record<string, string> = {};
for (const [key, value] of Object.entries(DAY_MAP)) {
  DAY_MAP_REVERSE[value] = key;
}

const dayIndexToName: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
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

// Helper to format date to DD-MM-YYYY
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getFullYear()}`;
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

// Update the updateMonthlySheet function to follow the recommended data structure
export const updateMonthlySheet = async (
  schedule: Schedule,
  students: Student[],
  monthYear: string
) => {
  try {
    // Ensure authenticated
    if (!accessToken) {
      throw new Error('Usuario no autenticado');
    }
    gapi.client.setToken({ access_token: accessToken });

    // Check if the sheet exists
    const spreadsheet = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetExists = spreadsheet.result.sheets.some(
      (sheet: any) => sheet.properties.title === monthYear
    );

    if (!sheetExists) {
      // Create the sheet
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: monthYear,
                },
              },
            },
          ],
        },
      });
    }

    // Check if the sheet has data
    const checkRange = `${monthYear}!A:A`;
    const checkResponse = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: checkRange,
    });
    const hasData =
      checkResponse.result.values && checkResponse.result.values.length > 1;

    const data: string[][] = [];
    if (!hasData) {
      // Initial load: populate with assignments from 2025 sheet
      data.push(['FECHA', 'CLASE', 'ID', 'ALUMNA', 'ESTADO', 'TIMESTAMP']); // Header
      const now = new Date().toLocaleString('sv-SE', { timeZone: 'Etc/GMT+3' });
      for (const dayName in schedule) {
        const classes = schedule[dayName] || [];
        for (const classData of classes) {
          for (const booking of classData.bookings) {
            const classId = `${DAY_MAP_REVERSE[dayName]}${classData.time}`;
            const student = students.find((s) => s.id === booking.studentId);
            if (student) {
              data.push([
                formatDate(booking.startDate),
                classId,
                booking.studentId,
                `${student.nombre} ${student.apellido}`,
                '1',
                now,
              ]);
            }
          }
        }
      }
    } else {
      // Update: use existing header
      data.push(['FECHA', 'CLASE', 'ID', 'ALUMNA', 'ESTADO', 'TIMESTAMP']);
    }

    const year = parseInt(monthYear.split('-')[0]);
    const month = parseInt(monthYear.split('-')[1]) - 1; // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Etc/GMT+3' });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekdays only
        const dayName = dayIndexToName[dayOfWeek];
        const classes = schedule[dayName] || [];
        for (const classData of classes) {
          const dateString = `${date.getDate().toString().padStart(2, '0')}-${(
            date.getMonth() + 1
          )
            .toString()
            .padStart(2, '0')}-${date.getFullYear()}`;
          const dateStringISO = date.toISOString().split('T')[0]; // YYYY-MM-DD for comparisons
          const absentStudentIds = new Set(
            (classData.absences ?? [])
              .filter((a) => a.date === dateString)
              .map((a) => a.studentId)
          );
          const permanentStudentIds = new Set(
            classData.bookings
              .filter((b) => b.startDate <= dateStringISO)
              .map((b) => b.studentId)
          );
          const oneTimeStudentIds = new Set(
            (classData.oneTimeBookings ?? [])
              .filter((b) => b.date === dateString)
              .map((b) => b.studentId)
          );

          const classId = `${DAY_MAP_REVERSE[dayName]}${classData.time}`;

          // For permanent students present
          for (const studentId of permanentStudentIds) {
            const student = students.find((s) => s.id === studentId);
            if (student) {
              if (!absentStudentIds.has(studentId)) {
                data.push([
                  dateString,
                  classId,
                  studentId,
                  `${student.nombre} ${student.apellido}`,
                  '1',
                  now,
                ]);
              } else {
                data.push([
                  dateString,
                  classId,
                  studentId,
                  `${student.nombre} ${student.apellido}`,
                  '0',
                  now,
                ]);
              }
            }
          }

          // For one-time students (always present, so 1)
          for (const studentId of oneTimeStudentIds) {
            const student = students.find((s) => s.id === studentId);
            if (student) {
              data.push([
                dateString,
                classId,
                studentId,
                `${student.nombre} ${student.apellido}`,
                '1',
                now,
              ]);
            }
          }
        }
      }
    }

    // Clear the sheet and write new data
    const clearRange = `${monthYear}!A:Z`;
    await gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: clearRange,
    });

    const range = `${monthYear}!A1:F${data.length}`;
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: { values: data },
    });

    console.log(`Hoja ${monthYear} actualizada correctamente`);
  } catch (err: any) {
    console.error('Error al actualizar la hoja mensual:', err);
    throw new Error(
      'Error al actualizar la hoja mensual: ' +
        (err.result?.error?.message || err.message)
    );
  }
};
