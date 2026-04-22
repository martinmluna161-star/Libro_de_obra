# 🏗 Diario de Obra — Sanchez Gil +arquitectura

> Sistema digital de registro diario de obras. Carga desde campo, base de datos en Google Sheets, reporte automático por proyecto para clientes.

---

## ¿Qué es esto?

Sistema completo de documentación de obras compuesto por 3 HTMLs estáticos hosteados en GitHub Pages, con backend en Google Apps Script y base de datos en Google Sheets.

**Sin servidores. Sin suscripciones. Sin instalaciones.**

---

## Archivos del sistema

| Archivo | Uso | Quién lo opera |
|---|---|---|
| `libro-diario-obra.html` | Carga de registros diarios | Director / Conductor de obra |
| `base-datos-obra.html` | Historial completo, gráficos, gestión | Uso interno — Logica / Sanchez Gil |
| `reporte-cliente.html` | Vista por proyecto, solo lectura | Cliente (URL permanente) |
| `Code.gs` | Backend Google Apps Script | Se instala una sola vez |

---

## Flujo del sistema

```
libro-diario-obra.html
        │
        │  POST (guardar registro)
        ▼
Code.gs — Google Apps Script
        │
        │  lee / escribe
        ▼
Google Sheets (una hoja por proyecto)
        │
        │  GET (leer registros)
        ▼
base-datos-obra.html        reporte-cliente.html?proyecto=X
(dashboard interno)         (URL permanente por cliente)
```

---

## Instalación

### 1 — Google Apps Script

1. Abrí [script.google.com](https://script.google.com)
2. Nuevo proyecto → pegá el contenido de `Code.gs`
3. **Implementar → Nueva implementación**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier persona**
4. Copiá la URL generada → la vas a necesitar en el paso 3

> ⚠ Si querés usar un Sheets existente, pegá su ID en `const SHEET_ID = ''` antes de implementar. Si lo dejás vacío, el sistema crea el Sheets automáticamente.

---

### 2 — GitHub Pages

1. Este repo ya tiene GitHub Pages activado en la rama `main`
2. Tu URL base: `https://TU-USUARIO.github.io/diario-obra-sanchezgil/`

---

### 3 — Conectar Apps Script con los HTMLs

**En `libro-diario-obra.html`:**
- Abrí el archivo → pestaña **⚙ Config**
- Pegá la URL del Apps Script
- Clic en **"Probar conexión"** → verificar ✅

**En `base-datos-obra.html`:**
- Abrí el archivo
- Banner superior → pegá la URL del Apps Script
- Clic en **"Conectar y cargar datos"** → indicador verde **● Sheets**

---

### 4 — Primer registro de prueba

1. Abrí `libro-diario-obra.html`
2. Completá proyecto, número de informe, fecha y etapa
3. Clic en **💾 Guardar**
4. Verificar en Google Drive que se creó el Sheets con el registro
5. Abrir `base-datos-obra.html` → **↻ Actualizar** → el registro aparece en tabla

---

## URLs de clientes

Cada cliente recibe una URL única y permanente:

```
https://TU-USUARIO.github.io/diario-obra-sanchezgil/reporte-cliente.html?proyecto=NOMBRE-DEL-PROYECTO
```

> El nombre del proyecto en la URL debe ser **idéntico** al cargado en el libro (mayúsculas, espacios y acentos incluidos).

**Forma fácil:** `libro-diario-obra.html` → pestaña **⚙ Config** → el link se genera automáticamente → botón **📋 Copiar link**.

---

## Funcionalidades

### Libro Diario de Obra
- 6 secciones: General, Actividades, Mano de obra, Materiales, Ocurrencias, Fotos
- **Notas de audio** con transcripción automática en español
- Tablas dinámicas (personal, equipos, materiales) con filas agregables
- Sheet de fotografías con compresión automática
- Guardado en Google Sheets vía Apps Script
- Exportar PDF (impresión del navegador)
- Autoguardado local cada 60 segundos como respaldo offline

### Base de Datos
- Conexión directa a Google Sheets — datos en tiempo real
- Caché local automática para uso offline
- Filtros por texto, fecha, proyecto y etapa
- Gráficos de evolución de avance y distribución por etapa
- Cards de proyectos activos con barra de progreso
- Panel lateral de detalle con fotos
- Eliminar registros (elimina en Sheets)
- Exportar CSV / Importar JSON
- Indicador de fuente: Sheets en vivo vs caché

### Reporte Cliente
- Carga datos desde Sheets filtrados por proyecto
- Resumen ejecutivo del estado actual
- Último día: actividades, personal, materiales, ocurrencias, fotos
- **Historial completo expandible** de todos los registros del proyecto
- Barra de progreso visual
- Bloque de firmas para impresión
- Botón "Descargar PDF" con fecha de impresión automática
- Funciona offline con caché local como respaldo

---

## Actualizar el sistema

**HTMLs:** editar directamente en GitHub → commit → Pages se actualiza en ~1 min.

**Code.gs:** pegar nuevo código en Apps Script → **Implementar → Administrar implementaciones → Nueva versión → Implementar**. La URL no cambia.

---

## Troubleshooting

**"No se pudo conectar con Sheets"**
- Verificar que la URL termine en `/exec`
- Confirmar acceso "Cualquier persona" en Apps Script
- Si se modificó el código, crear nueva versión al reimplementar

**El Sheets no se creó**
- Verificar que se autorizaron permisos de Drive y Sheets al implementar
- Ejecutar `getSpreadsheet()` manualmente desde Apps Script

**Reporte cliente muestra "Sin registros"**
- El nombre del proyecto en la URL debe ser idéntico al del libro
- Usar el botón "Copiar link" de la pestaña Config del libro

**GitHub Pages error 404**
- Verificar Settings → Pages → Branch: main
- Esperar hasta 5 minutos después del primer deploy

---

## Tecnologías

- **Frontend:** HTML5 + CSS3 + JavaScript vanilla
- **Gráficos:** Chart.js 4.4
- **Tipografía:** Barlow / Barlow Condensed (Google Fonts)
- **Backend:** Google Apps Script
- **Base de datos:** Google Sheets
- **Hosting:** GitHub Pages

---

## Créditos

Desarrollado por **[Logica](https://logica.com.ar)** para **Sanchez Gil +arquitectura**.  
Diseño y arquitectura: Martín — Logica, San Luis, Argentina.
