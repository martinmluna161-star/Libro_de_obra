// ============================================================
//  SANCHEZ GIL +arquitectura — Diario de Obra
//  Google Apps Script Web App  |  Code.gs  v2.0
// ============================================================
//
//  INSTRUCCIONES DE DEPLOY:
//  1. script.google.com → Nuevo proyecto → pegá este código
//  2. Implementar → Nueva implementación
//     · Tipo: Aplicación web
//     · Ejecutar como: Yo
//     · Acceso: Cualquier persona
//  3. Copiá la URL → pegala en libro-diario-obra.html (pestaña ⚙ Config)
//     La misma URL se usa en base-datos-obra.html
//  4. El Sheets se crea automático la primera vez.
//     Para usar uno existente: pegá su ID en SHEET_ID abajo.
// ============================================================

const SHEET_ID        = '';   // Vacío = crear nuevo automáticamente
const SHEET_FILE_NAME = 'Diario de Obra — Sanchez Gil +arquitectura';

const COLUMNAS = [
  'numero','fecha','proyecto','responsable','etapa','avance',
  'clima','temp','horaIni','horaFin',
  'actDescripcion','actPendiente','actPlan','actReal',
  'incDescripcion','incVisitas','incInstrucciones','incSeguridad',
  'personal_json','equipos_json','materiales_json',
  'fotos_count','fotos_json',
  'timestamp'
];

const HEADERS = [
  'N°','Fecha','Proyecto','Responsable','Etapa','Avance %',
  'Clima','Temperatura','Hora Inicio','Hora Fin',
  'Actividades','Pendientes','% Plan','% Real',
  'Incidentes','Visitas','Instrucciones','Seguridad',
  'Personal (JSON)','Equipos (JSON)','Materiales (JSON)',
  'Cant. Fotos','Fotos (JSON)',
  'Timestamp'
];

// ── CORS ────────────────────────────────────────────────────
function corsResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET ─────────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action || 'get_registros';

    if (action === 'get_proyectos')
      return corsResponse(getProyectos());

    if (action === 'get_registros')
      return corsResponse(getRegistros(e.parameter.proyecto || ''));

    if (action === 'get_ultimo')
      return corsResponse(getUltimoRegistro(e.parameter.proyecto || ''));

    // ── NUEVO: devuelve TODOS los registros de TODOS los proyectos ──
    if (action === 'get_todos')
      return corsResponse(getTodosLosRegistros());

    // ── NUEVO: estadísticas globales para el dashboard ──
    if (action === 'get_stats')
      return corsResponse(getStats());

    return corsResponse({ error: 'Acción no reconocida' });

  } catch(err) {
    return corsResponse({ error: err.message });
  }
}

// ── POST ────────────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action || 'guardar_registro';

    if (action === 'guardar_registro')
      return corsResponse({ ok: true, result: guardarRegistro(payload.data) });

    if (action === 'eliminar_registro')
      return corsResponse({ ok: true, result: eliminarRegistro(payload.proyecto, payload.numero) });

    if (action === 'transcribir_audio')
      return corsResponse(transcribirAudio(payload.audioBase64, payload.mimeType));

    if (action === 'subir_foto')
      return corsResponse(subirFotoADrive(payload));

    return corsResponse({ error: 'Acción no reconocida' });

  } catch(err) {
    return corsResponse({ error: err.message });
  }
}

// ── SPREADSHEET ─────────────────────────────────────────────
function getSpreadsheet() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  const files = DriveApp.getFilesByName(SHEET_FILE_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());

  // Crear nuevo
  const ss = SpreadsheetApp.create(SHEET_FILE_NAME);
  const def = ss.getSheets()[0];
  const idx = ss.insertSheet('📋 ÍNDICE');
  idx.getRange('A1').setValue('DIARIO DE OBRA — Sanchez Gil +arquitectura')
     .setFontWeight('bold').setFontSize(14);
  idx.getRange('A3:E3').setValues([['Proyecto','Hoja','Creado','Último registro','Total registros']])
     .setFontWeight('bold').setBackground('#1A1A1A').setFontColor('#F5A800');
  ss.deleteSheet(def);
  return ss;
}

function getHojaProyecto(nombreProyecto) {
  const ss = getSpreadsheet();
  const nombre = slugify(nombreProyecto);
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.getRange(1,1,1,HEADERS.length).setValues([HEADERS])
        .setBackground('#1A1A1A').setFontColor('#F5A800').setFontWeight('bold');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(1,55); hoja.setColumnWidth(2,100);
    hoja.setColumnWidth(3,200); hoja.setColumnWidth(11,350);
    actualizarIndice(ss, nombreProyecto, nombre);
  }
  return hoja;
}

// ── GUARDAR ─────────────────────────────────────────────────
function guardarRegistro(data) {
  const hoja = getHojaProyecto(data.proyecto);
  const lastRow = hoja.getLastRow();
  let filaExistente = -1;

  if (lastRow > 1) {
    const nums = hoja.getRange(2,1,lastRow-1,1).getValues();
    for (let i = 0; i < nums.length; i++) {
      if (String(nums[i][0]) === String(data.numero)) { filaExistente = i+2; break; }
    }
  }

  const fila = COLUMNAS.map(col => {
    const v = data[col];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });

  if (filaExistente > 0) {
    hoja.getRange(filaExistente,1,1,fila.length).setValues([fila]);
    actualizarUltimoRegistroIndice(getSpreadsheet(), data.proyecto, data.fecha, lastRow-1);
    return { action:'updated', fila: filaExistente };
  } else {
    const newRow = hoja.getLastRow()+1;
    hoja.getRange(newRow,1,1,fila.length).setValues([fila]);
    if (newRow % 2 === 0) hoja.getRange(newRow,1,1,fila.length).setBackground('#F9F7F5');
    actualizarUltimoRegistroIndice(getSpreadsheet(), data.proyecto, data.fecha, newRow-1);
    return { action:'inserted', fila: newRow };
  }
}

// ── LEER PROYECTO ────────────────────────────────────────────
function getRegistros(nombreProyecto) {
  if (!nombreProyecto) return { error:'Proyecto requerido' };
  const ss = getSpreadsheet();
  const hoja = ss.getSheetByName(slugify(nombreProyecto));
  if (!hoja) return { registros:[], proyecto:nombreProyecto };

  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return { registros:[], proyecto:nombreProyecto };

  const datos = hoja.getRange(2,1,lastRow-1,COLUMNAS.length).getValues();
  const registros = parsearFilas(datos)
    .sort((a,b) => a.fecha > b.fecha ? -1 : 1);

  return { registros, proyecto:nombreProyecto, total:registros.length };
}

function getUltimoRegistro(nombreProyecto) {
  const r = getRegistros(nombreProyecto);
  if (r.error) return r;
  return { registro: r.registros[0] || null, proyecto:nombreProyecto };
}

// ── NUEVO: TODOS LOS REGISTROS ───────────────────────────────
function getTodosLosRegistros() {
  const ss = getSpreadsheet();
  const hojas = ss.getSheets().filter(h => h.getName() !== '📋 ÍNDICE');
  const todos = [];

  hojas.forEach(hoja => {
    const lastRow = hoja.getLastRow();
    if (lastRow < 2) return;
    const datos = hoja.getRange(2,1,lastRow-1,COLUMNAS.length).getValues();
    const regs = parsearFilas(datos);
    todos.push(...regs);
  });

  todos.sort((a,b) => a.fecha > b.fecha ? -1 : 1);
  return { registros:todos, total:todos.length };
}

// ── NUEVO: ESTADÍSTICAS GLOBALES ─────────────────────────────
function getStats() {
  const ss = getSpreadsheet();
  const hojas = ss.getSheets().filter(h => h.getName() !== '📋 ÍNDICE');
  let totalRegs = 0, totalFotos = 0;
  const proyectos = [];
  const etapaCount = {};

  hojas.forEach(hoja => {
    const lastRow = hoja.getLastRow();
    if (lastRow < 2) return;
    const datos = hoja.getRange(2,1,lastRow-1,COLUMNAS.length).getValues();
    const regs = parsearFilas(datos);
    totalRegs += regs.length;
    const nFotos = regs.reduce((s,r) => s+(r.fotos_count?parseInt(r.fotos_count):0),0);
    totalFotos += nFotos;
    const fechas = regs.map(r=>r.fecha).filter(Boolean).sort();
    const avances = regs.map(r=>parseInt(r.avance)).filter(v=>!isNaN(v));
    const ultimoAvance = avances.length ? avances[avances.length-1] : null;
    regs.forEach(r => { if(r.etapa) etapaCount[r.etapa]=(etapaCount[r.etapa]||0)+1; });
    proyectos.push({
      nombre: regs[0]?.proyecto || hoja.getName(),
      hoja: hoja.getName(),
      totalRegistros: regs.length,
      primerFecha: fechas[0]||'',
      ultimaFecha: fechas[fechas.length-1]||'',
      ultimoAvance,
      totalFotos: nFotos
    });
  });

  return { totalRegistros:totalRegs, totalProyectos:proyectos.length, totalFotos, proyectos, etapaCount };
}

// ── LISTA DE PROYECTOS ───────────────────────────────────────
function getProyectos() {
  const ss = getSpreadsheet();
  const hojas = ss.getSheets()
    .filter(h => h.getName() !== '📋 ÍNDICE')
    .map(h => h.getName());
  return { proyectos:hojas };
}

// ── ELIMINAR ─────────────────────────────────────────────────
function eliminarRegistro(nombreProyecto, numero) {
  const ss = getSpreadsheet();
  const hoja = ss.getSheetByName(slugify(nombreProyecto));
  if (!hoja) return { error:'Proyecto no encontrado' };
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return { error:'Sin registros' };
  const nums = hoja.getRange(2,1,lastRow-1,1).getValues();
  for (let i = 0; i < nums.length; i++) {
    if (String(nums[i][0]) === String(numero)) { hoja.deleteRow(i+2); return { ok:true }; }
  }
  return { error:'Registro no encontrado' };
}

// ── ÍNDICE ───────────────────────────────────────────────────
function actualizarIndice(ss, nombreProyecto, nombreHoja) {
  const idx = ss.getSheetByName('📋 ÍNDICE');
  if (!idx) return;
  const lastRow = Math.max(idx.getLastRow(), 3);
  const datos = lastRow > 3 ? idx.getRange(4,1,lastRow-3,2).getValues() : [];
  if (!datos.some(r=>r[0]===nombreProyecto)) {
    idx.getRange(lastRow+1,1,1,5).setValues([[
      nombreProyecto, nombreHoja, new Date().toLocaleDateString('es-AR'), '—', 0
    ]]);
  }
}

function actualizarUltimoRegistroIndice(ss, nombreProyecto, fecha, totalRegs) {
  const idx = ss.getSheetByName('📋 ÍNDICE');
  if (!idx) return;
  const lastRow = idx.getLastRow();
  if (lastRow < 4) return;
  const datos = idx.getRange(4,1,lastRow-3,5).getValues();
  for (let i = 0; i < datos.length; i++) {
    if (datos[i][0] === nombreProyecto) {
      idx.getRange(i+4,4).setValue(fecha);
      idx.getRange(i+4,5).setValue(totalRegs);
      break;
    }
  }
}

// ── SUBIR FOTO A GOOGLE DRIVE ────────────────────────────
function subirFotoADrive(payload) {
  try {
    const { proyecto, numero, fecha, nombre, base64, descripcion } = payload;

    // Carpeta raíz del sistema
    const CARPETA_RAIZ = 'Diario de Obra — Sanchez Gil +arquitectura';
    let carpetaRaiz = obtenerOCrearCarpeta(CARPETA_RAIZ, DriveApp.getRootFolder());

    // Subcarpeta por proyecto
    const nombreProyecto = slugify(proyecto) || 'proyecto-sin-nombre';
    let carpetaProyecto = obtenerOCrearCarpeta(nombreProyecto, carpetaRaiz);

    // Subcarpeta por informe (proyecto/fecha-numero)
    const nombreInforme = `${fecha || 'sin-fecha'}_inf-${numero || '000'}`;
    let carpetaInforme = obtenerOCrearCarpeta(nombreInforme, carpetaProyecto);

    // Crear el archivo imagen
    const bytes = Utilities.base64Decode(base64);
    const blob  = Utilities.newBlob(bytes, 'image/jpeg', nombre || 'foto.jpg');
    const file  = carpetaInforme.createFile(blob);

    // Hacer el archivo accesible con link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId  = file.getId();
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const thumbUrl= `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

    // Agregar descripción como propiedad del archivo
    if (descripcion) {
      file.setDescription(descripcion);
    }

    return { ok: true, id: fileId, url: viewUrl, thumb: thumbUrl };

  } catch(err) {
    Logger.log('Error subir foto: ' + err.message);
    return { error: err.message };
  }
}

function obtenerOCrearCarpeta(nombre, padre) {
  const iter = padre.getFoldersByName(nombre);
  if (iter.hasNext()) return iter.next();
  return padre.createFolder(nombre);
}

// ── TRANSCRIPCIÓN DE AUDIO ────────────────────────────────
// Google Speech-to-Text v1 — disponible directo desde Apps Script
// sin necesitar Google Cloud Console ni facturación
function transcribirAudio(audioBase64, mimeType) {
  try {
    // Determinar encoding según el mimeType
    const encoding = mimeType && mimeType.includes('mp4') ? 'MP3'
      : mimeType && mimeType.includes('ogg') ? 'OGG_OPUS'
      : 'WEBM_OPUS'; // default webm/opus

    const token = ScriptApp.getOAuthToken();
    const url = 'https://speech.googleapis.com/v1/speech:recognize';

    const body = {
      config: {
        encoding: encoding,
        sampleRateHertz: 48000,
        languageCode: 'es-AR',
        alternativeLanguageCodes: ['es-ES', 'es-MX'],
        enableAutomaticPunctuation: true,
        model: 'default',
        speechContexts: [{
          phrases: [
            'hormigón', 'mampostería', 'encofrado', 'ferrería', 'albañil',
            'capataz', 'plomería', 'electricidad', 'estructura', 'fundaciones',
            'zapata', 'columna', 'viga', 'losa', 'revoque', 'contrapiso',
            'metros cuadrados', 'metros cúbicos', 'bolsas de cemento',
            'hierro', 'arena', 'gravilla', 'cal', 'ladrillo', 'bloque',
            'Sanchez Gil', 'arquitectura', 'obra', 'proyecto', 'plano',
            'subcontratista', 'proveedor', 'remito', 'factura'
          ]
        }]
      },
      audio: {
        content: audioBase64
      }
    };

    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.error) {
      Logger.log('Speech API error: ' + JSON.stringify(result.error));
      return { error: result.error.message, texto: null };
    }

    if (!result.results || !result.results.length) {
      return { texto: '[Audio sin contenido audible]' };
    }

    const texto = result.results
      .map(r => r.alternatives[0].transcript)
      .join(' ')
      .trim();

    return { texto, ok: true };

  } catch(err) {
    Logger.log('Error transcripción: ' + err.message);
    return { error: err.message, texto: null };
  }
}

// ── HELPERS ──────────────────────────────────────────────────
function parsearFilas(datos) {
  return datos
    .filter(f => f[0] !== '')
    .map(f => {
      const obj = {};
      COLUMNAS.forEach((col,i) => {
        const v = f[i];
        const esJSON = ['personal_json','equipos_json','materiales_json','fotos_json'].includes(col);
        if (esJSON) {
          try { obj[col.replace('_json','')] = v ? JSON.parse(v) : []; }
          catch(e) { obj[col.replace('_json','')] = []; }
        } else {
          obj[col] = v;
        }
      });
      return obj;
    });
}

function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9\s\-]/g,'')
    .trim().substring(0,50);
}
