import {
  Student,
  Schedule,
  PaymentRecord,
  Level,
  Plan,
  AssignmentType,
  AttendanceStatus,
  PlanCosts,
  NonWorkingDay,
  ScheduleConfig,
  StudentStatus,
} from '../types';
import { generateInitialSchedule, DAY_CODE_MAP, DAY_NAME_TO_CODE } from '../constants';

// Email del usuario actual para la identificación en el backend
let currentUserEmail: string | null = null;
let currentYear: string = new Date().getFullYear().toString();
let currentSpreadsheetId: string | undefined = undefined;

export const setUserEmail = (email: string | null) => {
  currentUserEmail = email;
};

export const setServiceYear = (year: string) => {
  currentYear = year;
};

export const setSpreadsheetId = (id: string) => {
  currentSpreadsheetId = id;
};

export interface SheetConfig {
  id: string;
  name: string;
}

export const getAvailableSheets = async (email: string): Promise<SheetConfig[]> => {
  const result = await callRpc('getAvailableSheets', {}, email); // Pass email explicitly used for initial call
  return result.sheets || [];
};

const getSheetName = () => currentYear;
const getConfigSheetName = () => `${currentYear}-config`;
const getHolidaysSheetName = () => `${currentYear}-feriados`;

/**
 * Ensures that the basic sheets for a given year exist with the correct headers.
 */
export const ensureYearSheetsExist = async (year: string) => {
  try {
    const meta = await callRpc('getSpreadsheetMeta');
    const existingSheets = meta.sheets.map((s: any) => s.properties.title);

    // 1. Master Sheet (YYYY)
    if (!existingSheets.includes(year)) {
      console.log(`Creating master sheet for year ${year}...`);
      await callRpc('createSheet', { title: year });
      const headers = [
        'ID', 'NOMBRE', 'APELLIDO', 'TELEFONO', 'ESTADO', 'NIVEL', 'PLAN',
        'CLASE 1', 'CLASE 2', 'CLASE 3', 'INGRESO',
        'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
        'RECUPERAR'
      ];
      await callRpc('updateSheet', { range: `'${year}'!A1`, values: [headers] });
    }

    // 2. Config Sheet (YYYY-config)
    const configName = `${year}-config`;
    if (!existingSheets.includes(configName)) {
      console.log(`Creating config sheet for year ${year}...`);
      await callRpc('createSheet', { title: configName });
      const headers = ['Plan', 'Cuota', 'Estado', 'Modificado'];
      await callRpc('updateSheet', { range: `'${configName}'!A1`, values: [headers] });

      // Add default working days
      const nowStr = new Date().toLocaleDateString('es-AR');
      await callRpc('appendSheet', {
        range: `'${configName}'!A:D`,
        values: [['DiasLaborales', 'L,M,X,J,V', 'Vigente', nowStr]]
      });
    }

    // 3. Holidays Sheet (YYYY-feriados)
    const holidaysName = `${year}-feriados`;
    if (!existingSheets.includes(holidaysName)) {
      console.log(`Creating holidays sheet for year ${year}...`);
      await callRpc('createSheet', { title: holidaysName });
      const headers = ['ID', 'StartDate', 'EndDate', 'Description'];
      await callRpc('updateSheet', { range: `'${holidaysName}'!A1`, values: [headers] });
    }
  } catch (err) {
    console.error(`Error ensuring sheets exist for year ${year}:`, err);
    throw err;
  }
};

// Helper para llamar al backend
// Added explicit email override for initial setup calls where 'currentUserEmail' might not be set in this scope yet, or just to be safe.
const callRpc = async (action: string, payload: any = {}, emailOverride?: string) => {
  const emailToUse = emailOverride || currentUserEmail;
  if (!emailToUse) {
    console.warn("Llamada a RPC sin usuario configurado");
  }

  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      payload,
      userEmail: emailToUse,
      spreadsheetId: currentSpreadsheetId
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Error en RPC ${action}: ${response.statusText}`);
  }

  return response.json();
};

const LEVEL_MAP: Record<string, Level> = {
  B: Level.Basico,
  M: Level.Medio,
  A: Level.Avanzado,
};



const dayIndexToName: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
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
  if (!dateString) return dateString;

  let parts: string[] = [];

  if (dateString.includes('/')) {
    parts = dateString.split('/');
  } else if (dateString.includes('-')) {
    parts = dateString.split('-');
    // If it's already YYYY-MM-DD, return as is
    if (parts[0].length === 4) return dateString;
  } else {
    return dateString;
  }

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


// Constants removed - using dynamic getters getSheetName(), etc.

// Función para leer datos usando el backend
export const loadDataFromSheet = async (year?: string): Promise<{
  students: Student[];
  schedule: Schedule;
  payments: PaymentRecord;
}> => {
  if (year) {
    setServiceYear(year);
  }

  // Ensure the sheets exist for the current year
  await ensureYearSheetsExist(currentYear);

  try {
    const response = await callRpc('loadDataFromSheet', { year: currentYear });
    const rows: string[][] = response.values;

    const scheduleConfig = await loadScheduleConfig();
    const schedule: Schedule = generateInitialSchedule(scheduleConfig || undefined);

    if (!rows || rows.length < 2) {
      return {
        students: [],
        schedule,
        payments: {},
      };
    }

    const header = rows[0];
    const headerMap = header.reduce((acc, col, i) => {
      acc[col.trim()] = i;
      return acc;
    }, {} as Record<string, number>);

    const students: Student[] = [];
    const payments: PaymentRecord = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const getVal = (colName: string) => row[headerMap[colName]]?.trim() || '';

      const estadoStr = getVal('ESTADO');
      if (estadoStr === StudentStatus.Deleted) continue;

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
        estado: (estadoStr as StudentStatus) || StudentStatus.Active,
      };
      students.push(student);

      payments[studentId] = {};
      for (const monthAbbr in MONTH_MAP) {
        const paymentDate = getVal(monthAbbr);
        if (paymentDate) {
          const monthYear = `${getSheetName()}-${MONTH_MAP[monthAbbr]}`;
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
    const now = new Date();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    // If we are loading the "current" year according to system, use current month.
    // Otherwise, maybe use January or the first month of that year?
    // For now, let's use the current month if years match, otherwise January of that year.
    const monthToLoad = (now.getFullYear().toString() === currentYear) ? currentMonthStr : '01';
    const monthYear = `${currentYear}-${monthToLoad}`;

    try {
      const monthlyResponse = await callRpc('getSheetValues', { range: `'${monthYear}'!A:G` });

      const monthlyRows = monthlyResponse.values;

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
// Función para guardar datos usando el backend
export const updateSheet = async (range: string, values: string[][]) => {
  await callRpc('updateSheet', { range, values });
};

// Ejemplo de función para guardar un estudiante (adapta según necesidades)
export const saveStudentToSheet = async (student: Student) => {
  // Lógica para convertir student a filas y actualizar la planilla
  // Por ejemplo, encontrar la fila del estudiante y actualizar
  const range = `'${getSheetName()}'!A2:Z`; // Ajusta según la estructura
  const values = [
    [student.id, student.nombre, student.apellido /* ... otros campos */],
  ];
  await updateSheet(range, values);
};

// Update the updateMonthlySheet function to follow the recommended data structure
export const updateMonthlySheet = async (
  schedule: Schedule,
  students: Student[],
  monthYear: string,
  workingDays?: string[]
) => {
  try {
    // Check if the sheet exists
    const meta = await callRpc('getSpreadsheetMeta');
    const sheetExists = meta.sheets.some(
      (sheet: any) => sheet.properties.title === monthYear
    );

    if (!sheetExists) {
      // Create the sheet
      await callRpc('createSheet', { title: monthYear });
    }

    // Check existing data
    const checkResponse = await callRpc('getSheetValues', { range: `'${monthYear}'!A:G` });
    const existingRows = checkResponse.values || [];

    // If it has many rows, assume it's already initialized
    const hasFixedAssignments = existingRows.some((row: string[]) => row[3] === AssignmentType.FIJA);
    if (hasFixedAssignments && existingRows.length > 20) {
      console.log(`Hoja ${monthYear} ya está inicializada con clases fijas.`);
      return;
    }

    // Prepare data for initialization
    const header = [
      'FECHA',
      'CLASE_ID',
      'ALUMNA_ID',
      'TIPO_ASIGNACION',
      'ESTADO',
      'TIMESTAMP',
      'NOTAS',
    ];

    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Etc/GMT+3' });
    const year = parseInt(monthYear.split('-')[0]);
    const month = parseInt(monthYear.split('-')[1]) - 1; // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const newRows: string[][] = [];

    // Keep existing rows that are NOT 'FIJA' (e.g., RECUPERO added manually)
    const nonFixedRows = existingRows.filter((row: string[], idx: number) => {
      if (idx === 0) return false; // Skip old header
      return row[3] !== AssignmentType.FIJA;
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      let shouldInclude = false;
      if (workingDays) {
        const dayCode = ['D', 'L', 'M', 'X', 'J', 'V', 'S'][dayOfWeek];
        shouldInclude = workingDays.includes(dayCode);
      } else {
        shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 5;
      }

      if (shouldInclude) {
        const dayName = dayIndexToName[dayOfWeek];
        const classes = schedule[dayName] || [];
        for (const classData of classes) {
          const dateStringISO = date.toISOString().split('T')[0];

          const permanentStudentIds = new Set(
            classData.bookings
              .filter((b) => b.startDate <= dateStringISO)
              .map((b) => b.studentId)
          );

          const classId = `${DAY_NAME_TO_CODE[dayName]}${classData.time}`;

          for (const studentId of permanentStudentIds) {
            // Only add if not already present in nonFixedRows (redundant but safe)
            const alreadyExists = nonFixedRows.some(r => r[0] === dateStringISO && r[1] === classId && r[2] === studentId);
            if (!alreadyExists) {
              const isAbsent = (classData.absences ?? []).some(a => a.studentId === studentId && a.date === dateStringISO);
              const estado = isAbsent ? AttendanceStatus.CANCELADA_AVISO : AttendanceStatus.PROGRAMADA;

              newRows.push([
                dateStringISO,
                classId,
                studentId,
                AssignmentType.FIJA,
                estado,
                now,
                '',
              ]);
            }
          }
        }
      }
    }

    const finalData = [header, ...nonFixedRows, ...newRows];

    // Sort by date then classId for better readability
    finalData.sort((a, b) => {
      if (a[0] === 'FECHA') return -1;
      if (b[0] === 'FECHA') return 1;
      if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
      return a[1].localeCompare(b[1]);
    });

    // Write back
    await callRpc('clearSheet', { range: `'${monthYear}'!A:Z` });
    await callRpc('updateSheet', { range: `'${monthYear}'!A1`, values: finalData });

    console.log(`Hoja ${monthYear} inicializada/actualizada correctamente con ${finalData.length - 1} registros.`);
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
    // 1. Update Master Sheet (Master Sheet)
    const response = await callRpc('loadDataFromSheet'); // Reuse load logic or specific getValues

    const rows = response.values;
    if (!rows || rows.length < 2)
      throw new Error('No se encontraron datos en la hoja de alumnos');

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');
    const clase1Index = header.indexOf('CLASE 1');
    const clase2Index = header.indexOf('CLASE 2');
    const clase3Index = header.indexOf('CLASE 3');
    const planIndex = header.indexOf('PLAN');

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

    // Update the cell in Master sheet
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const colLetter = getColumnLetter(targetColIndex);
    const range = `'${getSheetName()}'!${colLetter}${rowIndex}`;

    await callRpc('updateSheet', { range, values: [[classId]] });

    // 2. Update Monthly Sheet (e.g., 'YYYY-MM')
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
    const meta = await callRpc('getSpreadsheetMeta');
    const sheetExists = meta.sheets.some(
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
        await callRpc('appendSheet', { range: `'${monthYear}'!A:G`, values: newRows });
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
    // 1. Update Master Sheet (Master Sheet)
    const response = await callRpc('loadDataFromSheet');

    const rows = response.values;
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

    // Clear the cell in Master sheet
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const colLetter = getColumnLetter(targetColIndex);
    const range = `'${getSheetName()}'!${colLetter}${rowIndex}`;

    await callRpc('updateSheet', { range, values: [['']] });

    // 2. Update Monthly Sheet (e.g., 'YYYY-MM')
    // Remove future occurrences
    const meta = await callRpc('getSpreadsheetMeta');
    const sheetExists = meta.sheets.some(
      (sheet: any) => sheet.properties.title === monthYear
    );

    if (sheetExists) {
      const monthlyResponse = await callRpc('getSheetValues', { range: `'${monthYear}'!A:G` });

      const monthlyRows = monthlyResponse.values;
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
          // Write back if changes were made
          if (newRows.length < monthlyRows.length) {
            // Clear the sheet first
            await callRpc('clearSheet', { range: `${monthYear}!A:G` });

            // Write new rows
            await callRpc('updateSheet', {
              range: `${monthYear}!A1`,
              values: newRows
            });
          }
        }
      }
    }

    console.log(`Eliminación recurrente completada para ${studentId} de ${classId}`);
  } catch (err: any) {
    console.error('Error removing student:', err);
    throw err;
  }
};

export const updatePaymentStatus = async (
  studentId: string,
  monthYear: string,
  paymentDate: string
) => {
  try {
    // 1. Get data to find row and column
    const response = await callRpc('loadDataFromSheet');

    const rows = response.values;
    if (!rows || rows.length < 2)
      throw new Error('No se encontraron datos en la hoja de alumnos');

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');

    // Extract month from monthYear (e.g., "YYYY-MM")
    const monthNum = monthYear.split('-')[1]; // "01"

    // Reverse MONTH_MAP to find column name
    const monthAbbr = Object.keys(MONTH_MAP).find(key => MONTH_MAP[key] === monthNum);

    if (!monthAbbr) throw new Error('Mes inválido');

    const monthIndex = header.indexOf(monthAbbr);

    if (idIndex === -1 || monthIndex === -1)
      throw new Error('No se encontraron las columnas necesarias');

    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === studentId) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (rowIndex === -1) throw new Error('Estudiante no encontrado');

    // Update cell
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const colLetter = getColumnLetter(monthIndex);
    const range = `'${getSheetName()}'!${colLetter}${rowIndex}`;

    // Format date to DD-MM-YYYY if it's not empty
    let valueToSave = '';
    if (paymentDate) {
      const [year, month, day] = paymentDate.split('-');
      valueToSave = `${day}-${month}-${year}`;
    }

    await callRpc('updateSheet', { range, values: [[valueToSave]] });

    console.log(`Pago actualizado para ${studentId} en ${monthYear}: ${valueToSave}`);

  } catch (err: any) {
    console.error('Error updating payment status:', err);
    throw new Error('Error al actualizar el estado del pago: ' + err.message);
  }
};


export const registerStudentAbsence = async (
  studentId: string,
  classId: string,
  date: string,
  withMakeup: boolean
) => {
  try {
    const monthYear = date.substring(0, 7); // YYYY-MM
    const sheetName = monthYear;

    // 1. Check if the sheet exists
    const meta = await callRpc('getSpreadsheetMeta');
    const sheetExists = meta.sheets.some((s: any) => s.properties.title === sheetName);

    if (!sheetExists) {
      throw new Error(`La hoja del mes ${sheetName} no ha sido inicializada. Por favor, asegúrate de navegar a este mes en el calendario primero.`);
    }

    const response = await callRpc('getSheetValues', { range: `${sheetName}!A:G` });

    const rows = response.values;
    if (!rows || rows.length === 0) {
      throw new Error(`La hoja ${sheetName} está vacía.`);
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

    await callRpc('updateSheet', {
      range: `${sheetName}!${estadoColLetter}${rowIndex}`,
      values: [[newStatus]]
    });

    // 3. If withMakeup, update Master sheet
    if (withMakeup) {
      const mainSheetResponse = await callRpc('loadDataFromSheet');

      const mainRows = mainSheetResponse.values;
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

            await callRpc('updateSheet', {
              range: `'${getSheetName()}'!${recuperarColLetter}${i + 1}`,
              values: [[newRecupero]]
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

export const assignStudentToClassSingleDay = async (
  studentId: string,
  classId: string,
  date: string
) => {
  try {
    // 1. Decrement RECUPERAR in Master sheet
    const mainSheetResponse = await callRpc('loadDataFromSheet');

    const mainRows = mainSheetResponse.values;
    const mainHeader = mainRows[0].map((col: string) => col.trim());
    const idIndex = mainHeader.indexOf('ID');
    const recuperarIndex = mainHeader.indexOf('RECUPERAR');

    if (idIndex === -1 || recuperarIndex === -1) {
      throw new Error('Columnas ID o RECUPERAR no encontradas');
    }

    let studentRowIndex = -1;
    let currentRecupero = 0;

    for (let i = 1; i < mainRows.length; i++) {
      if (mainRows[i][idIndex]?.trim() === studentId) {
        studentRowIndex = i + 1;
        const rawRecupero = mainRows[i][recuperarIndex];
        currentRecupero = parseInt(rawRecupero, 10);
        if (isNaN(currentRecupero)) currentRecupero = 0;
        break;
      }
    }

    if (studentRowIndex === -1) throw new Error('Estudiante no encontrado');
    if (currentRecupero <= 0) throw new Error('No tiene clases para recuperar');

    // Helper to get column letter
    const getColumnLetter = (index: number): string => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const recuperarColLetter = getColumnLetter(recuperarIndex);
    await callRpc('updateSheet', {
      range: `'${getSheetName()}'!${recuperarColLetter}${studentRowIndex}`,
      values: [[currentRecupero - 1]]
    });

    // 2. Add to Monthly Sheet
    const monthYear = date.substring(0, 7); // YYYY-MM
    const sheetName = monthYear;

    const meta = await callRpc('getSpreadsheetMeta');
    let sheetExists = meta.sheets.some(
      (sheet: any) => sheet.properties.title === sheetName
    );

    if (!sheetExists) {
      await callRpc('createSheet', { title: sheetName });
      // Add header
      await callRpc('updateSheet', {
        range: `${sheetName}!A1`,
        values: [['FECHA', 'CLASE_ID', 'ALUMNA_ID', 'TIPO_ASIGNACION', 'ESTADO', 'TIMESTAMP', 'NOTAS']],
      });
    }

    const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Etc/GMT+3' });

    await callRpc('appendSheet', {
      range: `${sheetName}!A:G`,
      values: [
        [
          date,
          classId,
          studentId,
          AssignmentType.RECUPERO,
          AttendanceStatus.PROGRAMADA,
          timestamp,
          ''
        ],
      ],
    });

  } catch (err: any) {
    console.error('Error assigning student for single day:', err);
    throw err;
  }
};

export const loadPlanCosts = async (): Promise<PlanCosts | null> => {
  try {
    // Check if config sheet exists
    const meta = await callRpc('getSpreadsheetMeta');

    const sheetExists = meta.sheets.some(
      (sheet: any) => sheet.properties.title === getConfigSheetName()
    );

    if (!sheetExists) {
      return null; // Return null to use defaults
    }

    const response = await callRpc('getSheetValues', { range: `'${getConfigSheetName()}'!A:D` });

    const rows = response.values;
    if (!rows || rows.length < 2) return null;

    const header = rows[0].map((h: string) => h.trim().toLowerCase());
    const planIndex = header.indexOf('plan');
    const cuotaIndex = header.indexOf('cuota');
    const estadoIndex = header.indexOf('estado');

    if (planIndex === -1 || cuotaIndex === -1 || estadoIndex === -1) return null;

    const costs: PlanCosts = {} as PlanCosts;
    let foundAny = false;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const estado = (row[estadoIndex] || '').trim().toLowerCase();
      if (estado === 'vigente') {
        const plan = parseInt(row[planIndex], 10) as Plan;
        const cuota = parseInt(row[cuotaIndex], 10);
        if (!isNaN(plan) && !isNaN(cuota)) {
          costs[plan] = cuota;
          foundAny = true;
        }
      }
    }

    return foundAny ? costs : null;

  } catch (err) {
    console.error('Error loading plan costs:', err);
    return null;
  }
};

export const loadWorkingDays = async (): Promise<string[] | null> => {
  try {
    const meta = await callRpc('getSpreadsheetMeta');
    const sheetExists = meta.sheets.some(
      (sheet: any) => sheet.properties.title === getConfigSheetName()
    );

    if (!sheetExists) return null;

    const response = await callRpc('getSheetValues', { range: `'${getConfigSheetName()}'!A:D` });
    const rows = response.values;
    if (!rows || rows.length < 2) return null;

    const header = rows[0].map((h: string) => h.trim().toLowerCase());
    const planIndex = header.indexOf('plan');
    const estadoIndex = header.indexOf('estado');

    if (planIndex === -1 || estadoIndex === -1) return null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const planValue = (row[planIndex] || '').trim().toLowerCase();
      const estadoValue = (row[estadoIndex] || '').trim().toLowerCase();
      if (planValue === 'diaslaborales' && estadoValue === 'vigente') {
        const cuotaIndex = header.indexOf('cuota');
        if (cuotaIndex !== -1 && row[cuotaIndex]) {
          return row[cuotaIndex].split(',').map((d: string) => d.trim());
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Error loading working days:', err);
    return null;
  }
};

export const loadScheduleConfig = async (): Promise<ScheduleConfig | null> => {
  try {
    const response = await callRpc('getSheetValues', { range: `'${getConfigSheetName()}'!A:D` });
    const rows = response.values;
    if (!rows || rows.length < 2) return null;

    const header = rows[0].map((h: string) => h.trim().toLowerCase());
    const planIndex = header.indexOf('plan');
    const cuotaIndex = header.indexOf('cuota');
    const estadoIndex = header.indexOf('estado');

    if (planIndex === -1 || cuotaIndex === -1 || estadoIndex === -1) return null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const planValue = (row[planIndex] || '').trim().toLowerCase();
      const estadoValue = (row[estadoIndex] || '').trim().toLowerCase();

      if (planValue === 'horariosclases' && estadoValue === 'vigente') {
        const rawValue = row[cuotaIndex];
        if (!rawValue) continue;

        const config: ScheduleConfig = {};
        // Format: L:9,10|M:8,9,10
        const days = rawValue.split('|');
        for (const dayStr of days) {
          const [dayCode, hoursStr] = dayStr.split(':');
          if (!dayCode) continue;
          const dayName = DAY_CODE_MAP[dayCode.toUpperCase()];
          if (dayName && hoursStr) {
            config[dayName] = hoursStr
              .split(',')
              .map((h: string) => parseInt(h.trim(), 10))
              .filter((h: number) => !isNaN(h));
          }
        }
        return Object.keys(config).length > 0 ? config : null;
      }
    }

    return null;
  } catch (err) {
    console.error('Error loading schedule config:', err);
    return null;
  }
};

export const savePlanCosts = async (newCosts: PlanCosts) => {
  try {
    // 1. Ensure sheet exists
    const meta = await callRpc('getSpreadsheetMeta');

    let sheetExists = meta.sheets.some(
      (sheet: any) => sheet.properties.title === getConfigSheetName()
    );

    if (!sheetExists) {
      await callRpc('createSheet', { title: getConfigSheetName() });
      // Add header
      await callRpc('updateSheet', {
        range: `'${getConfigSheetName()}'!A1`,
        values: [['Plan', 'Cuota', 'Estado', 'Modificado']]
      });
    }

    // 2. Mark current "Vigente" as "Inactivo"
    const response = await callRpc('getSheetValues', { range: `'${getConfigSheetName()}'!A:D` });

    const rows = response.values;
    if (rows && rows.length > 1) {
      const header = rows[0].map((h: string) => h.trim());
      const estadoIndex = header.indexOf('Estado');

      if (estadoIndex !== -1) {
        const planIndex = header.indexOf('Plan');
        if (planIndex === -1) return;

        // Find all rows that are 'Vigente' AND are actual plan costs (1, 2, 3)
        const updates = [];
        const planNamesArr = Object.keys(newCosts);

        for (let i = 1; i < rows.length; i++) {
          const rowPlan = rows[i][planIndex];
          if (rows[i][estadoIndex] === 'Vigente' && planNamesArr.includes(rowPlan)) {
            // We need to update this cell to 'Inactivo'
            const colLetter = String.fromCharCode(65 + estadoIndex);
            updates.push({
              range: `'${getConfigSheetName()}'!${colLetter}${i + 1}`,
              values: [['Inactivo']]
            });
          }
        }

        // Execute updates
        for (const update of updates) {
          await callRpc('updateSheet', { range: update.range, values: update.values });
        }
      }
    }

    // 3. Append new costs
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

    const newRows = Object.entries(newCosts).map(([plan, cost]) => [
      plan,
      cost,
      'Vigente',
      dateStr
    ]);

    await callRpc('appendSheet', {
      range: `'${getConfigSheetName()}'!A:D`,
      values: newRows
    });

    console.log('Plan costs saved successfully');

  } catch (err: any) {
    console.error('Error saving plan costs:', err);
    throw new Error('Error al guardar la configuración de costos: ' + err.message);
  }
};

export const saveWorkingDays = async (days: string[]) => {
  try {
    const configSheet = getConfigSheetName();
    const response = await callRpc('getSheetValues', { range: `'${configSheet}'!A:D` });
    const rows = response.values;

    const today = new Date();
    const nowStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    const updates = [];

    if (rows && rows.length > 1) {
      const header = rows[0].map((h: string) => h.trim());
      const planIndex = header.indexOf('Plan');
      const estadoIndex = header.indexOf('Estado');

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][planIndex] === 'DiasLaborales' && rows[i][estadoIndex] === 'Vigente') {
          const colLetter = String.fromCharCode(65 + estadoIndex);
          updates.push({
            range: `'${configSheet}'!${colLetter}${i + 1}`,
            values: [['Inactivo']]
          });
        }
      }
    }

    if (updates.length > 0) {
      for (const update of updates) {
        await callRpc('updateSheet', update);
      }
    }

    await callRpc('appendSheet', {
      range: `'${configSheet}'!A:D`,
      values: [['DiasLaborales', days.join(','), 'Vigente', nowStr]]
    });

  } catch (err) {
    console.error('Error saving working days:', err);
    throw err;
  }
};

export const saveScheduleConfig = async (config: ScheduleConfig) => {
  try {
    const configSheet = getConfigSheetName();
    const response = await callRpc('getSheetValues', { range: `'${configSheet}'!A:D` });
    const rows = response.values;

    const today = new Date();
    const nowStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

    // Serialize config e.g., L:9,10|M:8,9,10
    const serialized = Object.entries(config)
      .map(([dayName, hours]) => {
        const dayCode = DAY_NAME_TO_CODE[dayName];
        return dayCode ? `${dayCode}:${hours.sort((a, b) => a - b).join(',')}` : '';
      })
      .filter(Boolean)
      .join('|');

    const updates = [];

    if (rows && rows.length > 1) {
      const header = rows[0].map((h: string) => h.trim());
      const planIndex = header.indexOf('Plan');
      const estadoIndex = header.indexOf('Estado');

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][planIndex] === 'HorariosClases' && rows[i][estadoIndex] === 'Vigente') {
          const colLetter = String.fromCharCode(65 + estadoIndex);
          updates.push({
            range: `'${configSheet}'!${colLetter}${i + 1}`,
            values: [['Inactivo']]
          });
        }
      }
    }

    if (updates.length > 0) {
      for (const update of updates) {
        await callRpc('updateSheet', update);
      }
    }

    await callRpc('appendSheet', {
      range: `'${configSheet}'!A:D`,
      values: [['HorariosClases', serialized, 'Vigente', nowStr]]
    });

  } catch (err) {
    console.error('Error saving schedule config:', err);
    throw err;
  }
};

/**
 * Create a new student in the Google Sheet
 * Validates that the student doesn't already exist (by NOMBRE and APELLIDO)
 * Generates a new ID (max existing ID + 1)
 * Sets ESTADO to 'OK' and INGRESO to the provided date or today
 */
export const createStudent = async (student: Student): Promise<Student> => {
  try {
    // 1. Load existing data to check for duplicates and get max ID
    const response = await callRpc('loadDataFromSheet');

    const rows = response.values;
    if (!rows || rows.length < 1) {
      throw new Error('No se pudo leer la hoja de alumnos');
    }

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');
    const nombreIndex = header.indexOf('NOMBRE');
    const apellidoIndex = header.indexOf('APELLIDO');
    const estadoIndex = header.indexOf('ESTADO');

    if (idIndex === -1 || nombreIndex === -1 || apellidoIndex === -1) {
      throw new Error('No se encontraron las columnas necesarias en la hoja');
    }

    // 2. Check for duplicate (NOMBRE + APELLIDO)
    const nombreLower = student.nombre.trim().toLowerCase();
    const apellidoLower = student.apellido.trim().toLowerCase();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const existingNombre = (row[nombreIndex] || '').trim().toLowerCase();
      const existingApellido = (row[apellidoIndex] || '').trim().toLowerCase();
      const estado = (row[estadoIndex] || '').trim();

      // Only check active students
      if (estado === 'OK' && existingNombre === nombreLower && existingApellido === apellidoLower) {
        throw new Error(`Ya existe una alumna con el nombre ${student.nombre} ${student.apellido}`);
      }
    }

    // 3. Generate new ID (YYNN - Year Suffix + 2 digits)
    const yearSuffixStr = currentYear.substring(2); // "26" for 2026
    const idPrefix = parseInt(yearSuffixStr, 10) * 100; // 2600

    let maxIdForYear = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const currentIdInt = parseInt(row[idIndex], 10);

      // Look for IDs that start with the current year's suffix (YYNN format)
      if (!isNaN(currentIdInt) && currentIdInt > idPrefix && currentIdInt < idPrefix + 100) {
        if (currentIdInt > maxIdForYear) {
          maxIdForYear = currentIdInt;
        }
      }
    }

    const newId = (maxIdForYear > 0 ? maxIdForYear + 1 : idPrefix + 1).toString();

    // 4. Prepare the new row data
    // Map level to letter code
    const levelCode = Object.entries(LEVEL_MAP).find(([code, level]) => level === student.nivel)?.[0] || 'B';

    // Format phone (remove 54911 prefix if present for storage)
    let phoneForSheet = student.telefono.replace(/^54911/, '');

    // Format date for sheet (DD/MM/YYYY)
    const formatDateForSheet = (dateStr: string): string => {
      if (!dateStr) {
        const today = new Date();
        return `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      }
      // If dateStr is YYYY-MM-DD, convert to DD/MM/YYYY
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    const ingresoDate = formatDateForSheet(student.fecha_inscripcion);

    // Build the row according to the sheet structure
    // Columns: ID, NOMBRE, APELLIDO, TELEFONO, ESTADO, NIVEL, PLAN, CLASE 1, CLASE 2, CLASE 3, INGRESO, ENE-DIC (12 months), RECUPERAR
    const newRow: any[] = [];

    for (let i = 0; i < header.length; i++) {
      const colName = header[i];
      switch (colName) {
        case 'ID':
          newRow[i] = newId;
          break;
        case 'NOMBRE':
          newRow[i] = student.nombre.toUpperCase();
          break;
        case 'APELLIDO':
          newRow[i] = student.apellido.toUpperCase();
          break;
        case 'TELEFONO':
          newRow[i] = phoneForSheet;
          break;
        case 'ESTADO':
          newRow[i] = 'OK';
          break;
        case 'NIVEL':
          newRow[i] = levelCode;
          break;
        case 'PLAN':
          newRow[i] = student.plan.toString();
          break;
        case 'INGRESO':
          newRow[i] = ingresoDate;
          break;
        case 'RECUPERAR':
          newRow[i] = (student.clases_recuperacion || 0).toString();
          break;
        case 'CLASE 1':
        case 'CLASE 2':
        case 'CLASE 3':
          newRow[i] = ''; // Empty by default
          break;
        default:
          // Payment months (ENE, FEB, etc.) - leave empty
          if (Object.keys(MONTH_MAP).includes(colName)) {
            newRow[i] = '';
          } else {
            newRow[i] = '';
          }
      }
    }

    // 5. Append the new row to the sheet
    await callRpc('appendSheet', {
      range: `'${getSheetName()}'!A:Z`,
      values: [newRow]
    });

    console.log(`Alumna creada exitosamente con ID ${newId}`);

    // Return the student with the new ID
    return {
      ...student,
      id: newId,
      fecha_inscripcion: student.fecha_inscripcion || new Date().toISOString().split('T')[0],
      estado: StudentStatus.Active,
    };
  } catch (err: any) {
    console.error('Error creating student:', err);
    throw new Error('Error al crear la alumna: ' + (err.message || 'Error desconocido'));
  }
};

/**
 * Update an existing student in the Google Sheet
 * Finds the student by ID and updates their information
 */
export const updateStudent = async (student: Student): Promise<void> => {
  try {
    // 1. Load existing data to find the student row
    const response = await callRpc('loadDataFromSheet');

    const rows = response.values;
    if (!rows || rows.length < 2) {
      throw new Error('No se encontraron datos en la hoja de alumnos');
    }

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');
    const nombreIndex = header.indexOf('NOMBRE');
    const apellidoIndex = header.indexOf('APELLIDO');
    const telefonoIndex = header.indexOf('TELEFONO');
    const nivelIndex = header.indexOf('NIVEL');
    const planIndex = header.indexOf('PLAN');
    const recuperarIndex = header.indexOf('RECUPERAR');

    if (idIndex === -1) {
      throw new Error('No se encontró la columna ID en la hoja');
    }

    // 2. Find the student row
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === student.id) {
        rowIndex = i + 1; // 1-based index for Sheets API
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`No se encontró la alumna con ID ${student.id}`);
    }

    // 3. Prepare updates for specific cells
    const levelCode = Object.entries(LEVEL_MAP).find(([code, level]) => level === student.nivel)?.[0] || 'B';
    let phoneForSheet = student.telefono.replace(/^54911/, '');

    const updates: any[] = [];

    // Helper to get column letter
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    // Update each field
    if (nombreIndex !== -1) {
      updates.push({
        range: `'${getSheetName()}'!${getColumnLetter(nombreIndex)}${rowIndex}`,
        values: [[student.nombre.toUpperCase()]],
      });
    }
    if (apellidoIndex !== -1) {
      updates.push({
        range: `'${getSheetName()}'!${getColumnLetter(apellidoIndex)}${rowIndex}`,
        values: [[student.apellido.toUpperCase()]],
      });
    }
    if (telefonoIndex !== -1) {
      updates.push({
        range: `'${getSheetName()}'!${getColumnLetter(telefonoIndex)}${rowIndex}`,
        values: [[phoneForSheet]],
      });
    }
    if (nivelIndex !== -1) {
      updates.push({
        range: `'${getSheetName()}'!${getColumnLetter(nivelIndex)}${rowIndex}`,
        values: [[levelCode]],
      });
    }
    if (planIndex !== -1) {
      updates.push({
        range: `'${getSheetName()}'!${getColumnLetter(planIndex)}${rowIndex}`,
        values: [[student.plan.toString()]],
      });
    }
    if (recuperarIndex !== -1) {
      updates.push({
        range: `'${getSheetName()}'!${getColumnLetter(recuperarIndex)}${rowIndex}`,
        values: [[(student.clases_recuperacion || 0).toString()]],
      });
    }
    const estadoIndex = header.indexOf('ESTADO');
    if (estadoIndex !== -1) {
      updates.push({
        range: `'${getSheetName()}'!${getColumnLetter(estadoIndex)}${rowIndex}`,
        values: [[student.estado || StudentStatus.Active]],
      });
    }

    // 4. Batch update all cells
    if (updates.length > 0) {
      await callRpc('batchUpdateValues', {
        data: updates
      });
    }

    console.log(`Alumna ${student.id} actualizada exitosamente`);
  } catch (err: any) {
    console.error('Error updating student:', err);
    throw new Error('Error al actualizar la alumna: ' + (err.message || 'Error desconocido'));
  }
};

/**
 * Delete a student by marking their ESTADO as 'BORRADA'
 * Does not physically delete the row, just marks it as deleted
 */
export const deleteStudent = async (studentId: string): Promise<void> => {
  try {
    // 1. Load existing data to find the student row
    const response = await callRpc('loadDataFromSheet');

    const rows = response.values;
    if (!rows || rows.length < 2) {
      throw new Error('No se encontraron datos en la hoja de alumnos');
    }

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');
    const estadoIndex = header.indexOf('ESTADO');

    if (idIndex === -1 || estadoIndex === -1) {
      throw new Error('No se encontraron las columnas necesarias en la hoja');
    }

    // 2. Find the student row
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === studentId) {
        rowIndex = i + 1; // 1-based index for Sheets API
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`No se encontró la alumna con ID ${studentId}`);
    }

    // 3. Update ESTADO to 'BORRADA'
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    const colLetter = getColumnLetter(estadoIndex);
    const range = `'${getSheetName()}'!${colLetter}${rowIndex}`;

    await callRpc('updateSheet', {
      range: range,
      values: [['BORRADA']]
    });

    console.log(`Alumna ${studentId} marcada como BORRADA exitosamente`);
  } catch (err: any) {
    console.error('Error deleting student:', err);
    throw new Error('Error al eliminar la alumna: ' + (err.message || 'Error desconocido'));
  }
};

// --- Non-Working Days Management ---

const ensureHolidaysSheetExists = async () => {
  try {
    const meta = await callRpc('getSpreadsheetMeta');
    const sheetExists = meta.sheets.some(
      (sheet: any) => sheet.properties.title === getHolidaysSheetName()
    );

    if (!sheetExists) {
      await callRpc('createSheet', { title: getHolidaysSheetName() });

      // Add header
      await callRpc('updateSheet', {
        range: `'${getHolidaysSheetName()}'!A1:D1`,
        values: [['ID', 'StartDate', 'EndDate', 'Description']],
      });
    }
  } catch (error) {
    console.error('Error ensuring holidays sheet exists:', error);
    throw error;
  }
};

export const loadNonWorkingDays = async (): Promise<NonWorkingDay[]> => {
  try {
    await ensureHolidaysSheetExists();

    const response = await callRpc('getSheetValues', { range: `'${getHolidaysSheetName()}'!A:D` });

    const rows = response.values;
    if (!rows || rows.length < 2) return [];

    // Skip header
    return rows.slice(1).map((row: string[]) => ({
      id: row[0],
      startDate: row[1],
      endDate: row[2],
      description: row[3],
    }));
  } catch (err) {
    console.error('Error loading non-working days:', err);
    return [];
  }
};

export const addNonWorkingDay = async (day: Omit<NonWorkingDay, 'id'>): Promise<NonWorkingDay> => {
  try {
    await ensureHolidaysSheetExists();

    const newId = `holiday-${Date.now()}`;
    const newRow = [newId, day.startDate, day.endDate, day.description];

    await callRpc('appendSheet', {
      range: `'${getHolidaysSheetName()}'!A:D`,
      values: [newRow]
    });

    return { id: newId, ...day };
  } catch (err: any) {
    console.error('Error adding non-working day:', err);
    throw new Error('Error al agregar día no laborable: ' + (err.message || 'Error desconocido'));
  }
};

// Helper removed as it's not needed for RPC (we don't need sheetId for deleteRow usually, unless we use batchUpdate with deleteDimension)
// But for deleteNonWorkingDay we do use deleteDimension which needs sheetId.
// We can expose a getSheetId in RPC or just fetch meta.
const getSheetIdByName = async (sheetName: string): Promise<number> => {
  const meta = await callRpc('getSpreadsheetMeta');
  const sheet = meta.sheets.find((s: any) => s.properties.title === sheetName);
  return sheet ? sheet.properties.sheetId : 0;
};

export const deleteNonWorkingDay = async (id: string): Promise<void> => {
  try {
    const response = await callRpc('getSheetValues', { range: `'${getHolidaysSheetName()}'!A:A` });

    const rows = response.values;
    if (!rows) return;

    const rowIndex = rows.findIndex((row: string[]) => row[0] === id);
    if (rowIndex === -1) return;

    // We need to implement deleteRow in RPC or use batchUpdate
    // Let's use batchUpdate generic call on RPC if available, or add deleteRow action.
    // Checking rpc.ts... I recall I didn't add deleteRow.
    // I can implement a 'batchUpdate' action in RPC.

    // For now, assuming I'll add 'batchUpdate' or 'deleteRow'.
    // Let's try to add 'batchUpdate' to RPC logic in next step.
    // Here I'll call it.

    await callRpc('deleteRow', {
      sheetId: await getSheetIdByName(getHolidaysSheetName()),
      rowIndex: rowIndex,
      endRowIndex: rowIndex + 1
    });

  } catch (err: any) {
    console.error('Error deleting non-working day:', err);
    throw new Error('Error al eliminar día no laborable: ' + (err.message || 'Error desconocido'));
  }
};

export const removeStudentFromAllFutureClasses = async (studentId: string) => {
  try {
    // 1. Clear CLASE 1, CLASE 2, CLASE 3 in Master sheet
    const response = await callRpc('loadDataFromSheet');
    const rows = response.values;
    if (!rows || rows.length < 2) throw new Error('No se encontraron datos en la hoja de alumnos');

    const header = rows[0].map((h: string) => h.trim());
    const idIndex = header.indexOf('ID');
    const clase1Index = header.indexOf('CLASE 1');
    const clase2Index = header.indexOf('CLASE 2');
    const clase3Index = header.indexOf('CLASE 3');

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === studentId) {
        rowIndex = i + 1;
        break;
      }
    }

    // Helper to get column letter
    const getColumnLetter = (index: number) => {
      let letter = '';
      while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
      }
      return letter;
    };

    if (rowIndex !== -1) {
      const updates = [];

      if (clase1Index !== -1) updates.push({ range: `'${getSheetName()}'!${getColumnLetter(clase1Index)}${rowIndex}`, values: [['']] });
      if (clase2Index !== -1) updates.push({ range: `'${getSheetName()}'!${getColumnLetter(clase2Index)}${rowIndex}`, values: [['']] });
      if (clase3Index !== -1) updates.push({ range: `'${getSheetName()}'!${getColumnLetter(clase3Index)}${rowIndex}`, values: [['']] });

      if (updates.length > 0) {
        // We'll execute updates sequentially as our updateSheet is one by one, 
        // or we need to add batchUpdate support.
        // For simplicity, sequential.
        for (const update of updates) {
          await callRpc('updateSheet', { range: update.range, values: update.values });
        }
      }
    }

    // 2. Remove future bookings from monthly sheet
    const today = new Date();
    const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Check if sheet exists
    const meta = await callRpc('getSpreadsheetMeta');
    const sheetExists = meta.sheets.some((s: any) => s.properties.title === monthYear);

    if (sheetExists) {
      const monthlyResponse = await callRpc('getSheetValues', { range: `${monthYear}!A:G` });
      const monthlyRows = monthlyResponse.values;
      if (monthlyRows && monthlyRows.length > 1) {
        const mHeader = monthlyRows[0];
        const fechaIndex = mHeader.indexOf('FECHA');
        const alumnaIdIndex = mHeader.indexOf('ALUMNA_ID');
        const tipoIndex = mHeader.indexOf('TIPO_ASIGNACION');

        const todayISO = today.toISOString().split('T')[0];

        const newRows = monthlyRows.filter((row: string[], index: number) => {
          if (index === 0) return true;
          const rowDate = row[fechaIndex];
          const rowStudentId = row[alumnaIdIndex];
          const rowTipo = row[tipoIndex];


          // Remove if student matches, is recurring (FIJA), and date is today or future
          if (rowStudentId === studentId && rowTipo === AssignmentType.FIJA && rowDate >= todayISO) {
            return false; // Remove
          }
          return true;
        });

        if (newRows.length < monthlyRows.length) {
          await callRpc('clearSheet', { range: `${monthYear}!A:G` });
          await callRpc('updateSheet', { range: `${monthYear}!A1`, values: newRows });
        }
      }
    }

    console.log(`Eliminadas clases futuras para alumna ${studentId} por cambio de plan`);

  } catch (err: any) {
    console.error('Error removing future classes:', err);
    throw new Error('Error al eliminar clases futuras: ' + (err.message || 'Error desconocido'));
  }
};

// --- Import Students ---

export const loadStudentsByYear = async (year: string): Promise<Student[]> => {
  try {
    const response = await callRpc('loadDataFromSheet', { year });
    const rows: string[][] = response.values;

    if (!rows || rows.length < 2) {
      return [];
    }

    const header = rows[0];
    const headerMap = header.reduce((acc, col, i) => {
      acc[col.trim()] = i;
      return acc;
    }, {} as Record<string, number>);

    const students: Student[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const getVal = (colName: string) => row[headerMap[colName]]?.trim() || '';

      const estadoStr = getVal('ESTADO');
      if (estadoStr === StudentStatus.Deleted) continue;

      const studentIdValue = getVal('ID');
      if (!studentIdValue) continue;

      students.push({
        id: studentIdValue,
        nombre: getVal('NOMBRE'),
        apellido: getVal('APELLIDO'),
        telefono: `54911${getVal('TELEFONO')}`,
        nivel: LEVEL_MAP[getVal('NIVEL')] || Level.Basico,
        fecha_inscripcion: parseDate(getVal('INGRESO')),
        plan: (parseInt(getVal('PLAN'), 10) as Plan) || 1,
        clases_recuperacion: 0, // Reset for new year
        estado: (estadoStr as StudentStatus) || StudentStatus.Active,
      });
    }
    return students;
  } catch (err) {
    console.error(`Error loading students for year ${year}:`, err);
    return [];
  }
};

export const importStudentsToCurrentYear = async (students: Student[]): Promise<void> => {
  try {
    const response = await callRpc('getSheetValues', { range: `'${currentYear}'!A1:Z1` });
    const rows = response.values;
    if (!rows || rows.length < 1) throw new Error('No se pudo leer la hoja actual');

    const header = rows[0].map((h: string) => h.trim());
    const today = new Date();
    const importDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    const newRows = students.map(student => {
      const newRow: string[] = new Array(header.length).fill('');
      const levelCode = Object.entries(LEVEL_MAP).find(([code, level]) => level === student.nivel)?.[0] || 'B';
      const phoneForSheet = student.telefono.replace(/^54911/, '');

      header.forEach((colName, i) => {
        switch (colName) {
          case 'ID': newRow[i] = student.id; break;
          case 'NOMBRE': newRow[i] = student.nombre.toUpperCase(); break;
          case 'APELLIDO': newRow[i] = student.apellido.toUpperCase(); break;
          case 'TELEFONO': newRow[i] = phoneForSheet; break;
          case 'ESTADO': newRow[i] = student.estado || StudentStatus.Active; break;
          case 'NIVEL': newRow[i] = levelCode; break;
          case 'PLAN': newRow[i] = student.plan.toString(); break;
          case 'INGRESO': newRow[i] = importDate; break;
          case 'RECUPERAR': newRow[i] = '0'; break;
        }
      });
      return newRow;
    });

    if (newRows.length > 0) {
      await callRpc('appendSheet', {
        range: `'${currentYear}'!A:Z`,
        values: newRows
      });
    }
  } catch (err: any) {
    console.error('Error importing students:', err);
    throw new Error('Error al importar alumnas: ' + (err.message || 'Error desconocido'));
  }
};
