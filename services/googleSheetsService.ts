import {
  Student,
  Schedule,
  PaymentRecord,
  Level,
  Plan,
  AssignmentType,
  AttendanceStatus,
} from '../types';
import { generateInitialSchedule, DAY_CODE_MAP, DAY_NAME_TO_CODE } from '../constants';

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
          const dayName = DAY_CODE_MAP[dayLetter];

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

    // Load absences from monthly sheet
    const currentDate = new Date();
    const monthYear = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, '0')}`;

    try {
      const monthlyResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${monthYear}!A:G`,
      });

      const monthlyRows = monthlyResponse.result.values;
      if (monthlyRows && monthlyRows.length > 1) {
        const mHeader = monthlyRows[0];
        const mHeaderMap = mHeader.reduce((acc: any, col: string, i: number) => {
          acc[col.trim()] = i;
          return acc;
        }, {} as Record<string, number>);

        for (let i = 1; i < monthlyRows.length; i++) {
          const row = monthlyRows[i];
          const getMVal = (colName: string) =>
            row[mHeaderMap[colName]]?.trim() || '';

          const fecha = getMVal('FECHA');
          const claseId = getMVal('CLASE_ID');
          const alumnaId = getMVal('ALUMNA_ID');
          const estado = getMVal('ESTADO');

          if (
            estado === AttendanceStatus.CANCELADA_SIN_AVISO ||
            estado === AttendanceStatus.CANCELADA_AVISO
          ) {
            // Find the class in schedule
            // claseId is like 'L09'
            if (claseId) {
              const dayLetter = claseId.charAt(0);
              const time = parseInt(claseId.substring(1), 10);
              const dayName = DAY_CODE_MAP[dayLetter];

              if (dayName && schedule[dayName]) {
                const classObj = schedule[dayName].find((c) => c.time === time);
                if (classObj) {
                  if (!classObj.absences) classObj.absences = [];
                  classObj.absences.push({
                    studentId: alumnaId,
                    date: fecha,
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not load monthly sheet ${monthYear}`, error);
      // It's okay if the sheet doesn't exist yet
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

    // Check if the sheet has data (more than just headers)
    const checkRange = `${monthYear}!A:A`;
    const checkResponse = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: checkRange,
    });
    const hasData =
      checkResponse.result.values && checkResponse.result.values.length > 1;

    // If the sheet already has records, do not update it
    if (hasData) {
      console.log(`Hoja ${monthYear} ya tiene registros, no se actualiza`);
      return;
    }

    const data: string[][] = [];
    // Header with new structure
    data.push([
      'FECHA',
      'CLASE_ID',
      'ALUMNA_ID',
      'TIPO_ASIGNACION',
      'ESTADO',
      'TIMESTAMP',
      'NOTAS',
    ]);

    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Etc/GMT+3' });
    const year = parseInt(monthYear.split('-')[0]);
    const month = parseInt(monthYear.split('-')[1]) - 1; // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekdays only
        const dayName = dayIndexToName[dayOfWeek];
        const classes = schedule[dayName] || [];
        for (const classData of classes) {
          const dateStringISO = date.toISOString().split('T')[0];

          const permanentStudentIds = new Set(
            classData.bookings
              .filter((b) => b.startDate <= dateStringISO)
              .map((b) => b.studentId)
          );

          // Note: We are initializing, so we assume no one-time bookings or absences exist yet for this month in the schedule object
          // unless they were pre-loaded. We'll handle them if they exist.

          const oneTimeStudentIds = new Set(
            (classData.oneTimeBookings ?? [])
              .filter((b) => b.date === dateStringISO) // Assuming oneTimeBookings use YYYY-MM-DD
              .map((b) => b.studentId)
          );

          const classId = `${DAY_NAME_TO_CODE[dayName]}${classData.time}`;

          // For permanent students
          for (const studentId of permanentStudentIds) {
            // Check if absent (cancelled)
            const isAbsent = (classData.absences ?? []).some(a => a.studentId === studentId && a.date === dateStringISO);

            const estado = isAbsent ? AttendanceStatus.CANCELADA_AVISO : AttendanceStatus.PROGRAMADA;

            data.push([
              dateStringISO,
              classId,
              studentId,
              AssignmentType.FIJA,
              estado,
              now,
              '',
            ]);
          }

          // For one-time students (Recoveries)
          for (const studentId of oneTimeStudentIds) {
            data.push([
              dateStringISO,
              classId,
              studentId,
              AssignmentType.RECUPERO,
              AttendanceStatus.PROGRAMADA,
              now,
              '',
            ]);
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

    const range = `${monthYear}!A1:G${data.length}`;
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: { values: data },
    });

    console.log(`Hoja ${monthYear} inicializada correctamente`);
  } catch (err: any) {
    console.error('Error al actualizar la hoja mensual:', err);
    throw new Error(
      'Error al actualizar la hoja mensual: ' +
      (err.result?.error?.message || err.message)
    );
  }
};

export const assignStudentToClassRecurring = async (
  studentId: string,
  classId: string,
  monthYear: string
) => {
  try {
    if (!accessToken) throw new Error('Usuario no autenticado');
    gapi.client.setToken({ access_token: accessToken });

    // 1. Update '2025' Sheet (Master Sheet)
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:W`,
    });

    const rows = response.result.values;
    if (!rows || rows.length < 2)
      throw new Error('No se encontraron datos en la hoja de alumnos');

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');
    const clase1Index = header.indexOf('CLASE 1');
    const clase2Index = header.indexOf('CLASE 2');
    const clase3Index = header.indexOf('CLASE 3');
    const planIndex = header.indexOf('PLAN');
    const nombreIndex = header.indexOf('NOMBRE');
    const apellidoIndex = header.indexOf('APELLIDO');

    if (idIndex === -1 || clase1Index === -1 || planIndex === -1)
      throw new Error('No se encontraron las columnas necesarias');

    let rowIndex = -1;
    let targetColIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === studentId) {
        rowIndex = i + 1; // 1-based index for Sheets API

        const plan = parseInt(rows[i][planIndex], 10) || 1;
        let currentClasses = 0;
        if (rows[i][clase1Index]) currentClasses++;
        if (rows[i][clase2Index]) currentClasses++;
        if (rows[i][clase3Index]) currentClasses++;

        if (currentClasses >= plan) {
          throw new Error('Alumna con cupo por plan completo');
        }

        // Find empty slot
        if (!rows[i][clase1Index]) targetColIndex = clase1Index;
        else if (!rows[i][clase2Index]) targetColIndex = clase2Index;
        else if (!rows[i][clase3Index]) targetColIndex = clase3Index;

        break;
      }
    }

    if (rowIndex === -1) throw new Error('Estudiante no encontrado');
    if (targetColIndex === -1)
      throw new Error('El estudiante ya tiene 3 clases asignadas');

    // Update the cell in '2025' sheet
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const colLetter = getColumnLetter(targetColIndex);
    const range = `${SHEET_NAME}!${colLetter}${rowIndex}`;

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: { values: [[classId]] },
    });

    // 2. Update Monthly Sheet (e.g., '2025-11')
    // Calculate dates for the rest of the month for this class day
    const dayChar = classId.charAt(0); // 'L', 'M', etc.
    const dayName = DAY_CODE_MAP[dayChar];

    let targetDayOfWeek = -1;
    for (const [key, val] of Object.entries(dayIndexToName)) {
      if (val === dayName) {
        targetDayOfWeek = parseInt(key);
        break;
      }
    }

    if (targetDayOfWeek === -1) throw new Error('Día de clase inválido');

    const currentYear = parseInt(monthYear.split('-')[0]);
    const currentMonth = parseInt(monthYear.split('-')[1]) - 1;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const newRows: string[][] = [];
    const timestamp = new Date().toLocaleString('sv-SE', {
      timeZone: 'Etc/GMT+3',
    });

    // Check if the monthly sheet exists before trying to append
    const spreadsheet = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetExists = spreadsheet.result.sheets.some(
      (sheet: any) => sheet.properties.title === monthYear
    );

    if (sheetExists) {
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentYear, currentMonth, d);
        if (date.getDay() === targetDayOfWeek) {
          // Only add if date is >= today to avoid rewriting history,
          // or we can decide to add all.
          // Let's add from today onwards to be safe.
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Note: date object here is created with local time (system time),
          // which matches 'today'.
          if (date >= today) {
            const dateStringISO = date.toISOString().split('T')[0];
            newRows.push([
              dateStringISO,
              classId,
              studentId,
              AssignmentType.FIJA,
              AttendanceStatus.PROGRAMADA,
              timestamp,
              '',
            ]);
          }
        }
      }

      if (newRows.length > 0) {
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${monthYear}!A:G`,
          valueInputOption: 'RAW',
          resource: { values: newRows },
        });
      }
    }

    console.log(`Asignación recurrente completada para ${studentId} en ${classId}`);
  } catch (err: any) {
    console.error('Error assigning student:', err);
    throw err;
  }
};

export const removeStudentFromClassRecurring = async (
  studentId: string,
  classId: string,
  monthYear: string
) => {
  try {
    if (!accessToken) throw new Error('Usuario no autenticado');
    gapi.client.setToken({ access_token: accessToken });

    // 1. Update '2025' Sheet (Master Sheet)
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:W`,
    });

    const rows = response.result.values;
    if (!rows || rows.length < 2)
      throw new Error('No se encontraron datos en la hoja de alumnos');

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');
    const clase1Index = header.indexOf('CLASE 1');
    const clase2Index = header.indexOf('CLASE 2');
    const clase3Index = header.indexOf('CLASE 3');

    if (idIndex === -1 || clase1Index === -1)
      throw new Error('No se encontraron las columnas necesarias');

    let rowIndex = -1;
    let targetColIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === studentId) {
        rowIndex = i + 1; // 1-based index for Sheets API

        // Find the slot with the classId
        if (rows[i][clase1Index] === classId) targetColIndex = clase1Index;
        else if (rows[i][clase2Index] === classId) targetColIndex = clase2Index;
        else if (rows[i][clase3Index] === classId) targetColIndex = clase3Index;

        break;
      }
    }

    if (rowIndex === -1) throw new Error('Estudiante no encontrado');
    if (targetColIndex === -1)
      throw new Error('El estudiante no tiene asignada esta clase');

    // Clear the cell in '2025' sheet
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const colLetter = getColumnLetter(targetColIndex);
    const range = `${SHEET_NAME}!${colLetter}${rowIndex}`;

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: { values: [['']] }, // Clear value
    });

    // 2. Update Monthly Sheet (e.g., '2025-11')
    // Remove future occurrences
    const spreadsheet = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetExists = spreadsheet.result.sheets.some(
      (sheet: any) => sheet.properties.title === monthYear
    );

    if (sheetExists) {
      const monthlyResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${monthYear}!A:G`,
      });

      const monthlyRows = monthlyResponse.result.values;
      if (monthlyRows && monthlyRows.length > 1) {
        const header = monthlyRows[0];
        const fechaIndex = header.indexOf('FECHA');
        const claseIdIndex = header.indexOf('CLASE_ID');
        const alumnaIdIndex = header.indexOf('ALUMNA_ID');

        if (fechaIndex !== -1 && claseIdIndex !== -1 && alumnaIdIndex !== -1) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayISO = today.toISOString().split('T')[0];

          const newRows = monthlyRows.filter((row, index) => {
            if (index === 0) return true; // Keep header

            const rowDate = row[fechaIndex];
            const rowClassId = row[claseIdIndex];
            const rowStudentId = row[alumnaIdIndex];

            // Check if this row should be removed
            // Remove if: Student matches AND Class matches AND Date >= Today
            if (
              rowStudentId === studentId &&
              rowClassId === classId &&
              rowDate >= todayISO
            ) {
              return false; // Remove
            }
            return true; // Keep
          });

          // Write back if changes were made
          if (newRows.length < monthlyRows.length) {
            // Clear the sheet first
            await gapi.client.sheets.spreadsheets.values.clear({
              spreadsheetId: SPREADSHEET_ID,
              range: `${monthYear}!A:Z`,
            });

            // Write new data
            await gapi.client.sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${monthYear}!A1`,
              valueInputOption: 'RAW',
              resource: { values: newRows },
            });
          }
        }
      }
    }

    console.log(`Desasignación recurrente completada para ${studentId} en ${classId}`);
  } catch (err: any) {
    console.error('Error removing student:', err);
    throw err;
  }
};

export const registerStudentAbsence = async (
  studentId: string,
  classId: string,
  date: string,
  withMakeup: boolean
) => {
  try {
    if (!accessToken) await signIn();
    gapi.client.setToken({ access_token: accessToken });

    const monthYear = date.substring(0, 7); // YYYY-MM
    const sheetName = monthYear;

    // 1. Find the row in the monthly sheet
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:G`,
    });

    const rows = response.result.values;
    if (!rows || rows.length === 0) {
      throw new Error(`No se encontraron datos en la hoja ${sheetName}`);
    }

    const header = rows[0];
    const fechaIndex = header.indexOf('FECHA');
    const claseIdIndex = header.indexOf('CLASE_ID');
    const alumnaIdIndex = header.indexOf('ALUMNA_ID');
    const estadoIndex = header.indexOf('ESTADO');

    if (
      fechaIndex === -1 ||
      claseIdIndex === -1 ||
      alumnaIdIndex === -1 ||
      estadoIndex === -1
    ) {
      throw new Error(
        'No se encontraron las columnas necesarias en la hoja mensual'
      );
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (
        rows[i][fechaIndex] === date &&
        rows[i][claseIdIndex] === classId &&
        rows[i][alumnaIdIndex] === studentId
      ) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (rowIndex === -1) {
      console.warn(
        `No se encontró la clase para ${studentId} en ${date} (${classId})`
      );
      return;
    }

    // 2. Update Status
    const newStatus = withMakeup
      ? AttendanceStatus.CANCELADA_AVISO
      : AttendanceStatus.CANCELADA_SIN_AVISO;

    // Helper to get column letter from index (0 -> A, 25 -> Z, 26 -> AA)
    const getColumnLetter = (index: number): string => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const estadoColLetter = getColumnLetter(estadoIndex);

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${estadoColLetter}${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[newStatus]],
      },
    });

    // 3. If withMakeup, update '2025' sheet
    if (withMakeup) {
      const mainSheetResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:Z`,
      });

      const mainRows = mainSheetResponse.result.values;
      const mainHeader = mainRows[0];
      const idIndex = mainHeader.indexOf('ID');
      const recuperarIndex = mainHeader.indexOf('RECUPERAR');

      if (idIndex !== -1 && recuperarIndex !== -1) {
        for (let i = 1; i < mainRows.length; i++) {
          if (mainRows[i][idIndex] === studentId) {
            const currentRecupero = parseInt(
              mainRows[i][recuperarIndex] || '0',
              10
            );
            const newRecupero = currentRecupero + 1;
            const recuperarColLetter = getColumnLetter(recuperarIndex);

            await gapi.client.sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${SHEET_NAME}!${recuperarColLetter}${i + 1}`,
              valueInputOption: 'RAW',
              resource: { values: [[newRecupero]] },
            });
            break;
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Error registering absence:', err);
    throw err;
  }
};
