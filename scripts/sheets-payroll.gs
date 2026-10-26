// Google Apps Script que va DENTRO de la hoja de payroll
// (Extensiones > Apps Script). Se publica como web app y devuelve la pestaña
// de payroll en JSON. Este archivo es solo una copia de referencia: el código
// que corre es el que pegues en el editor de Apps Script.
//
// Configuración (una sola vez), en el editor de Apps Script:
//   Configuración del proyecto (engranaje) > Propiedades de la secuencia de comandos:
//     API_TOKEN = <la misma clave que SHEETS_PAYROLL_TOKEN en el .env de la app>
//     SHEET_GID = 1122180919
//
// La URL del web app es pública, por eso cada pedido debe traer ?token=...

// Súbelo cada vez que cambie el código, para confirmar qué versión está publicada
const SCRIPT_VERSION = 3;

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const expectedToken = props.getProperty("API_TOKEN");

  if (!expectedToken || !e.parameter.token || e.parameter.token !== expectedToken) {
    return json({ error: "Unauthorized" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const tz = ss.getSpreadsheetTimeZone();

  // ?all=1 devuelve todas las pestañas con su grilla (hay una por período de pago)
  if (e.parameter.all) {
    return json({
      tabs: sheets.map((s) => ({ title: s.getName(), gid: s.getSheetId(), values: readValues(s, tz) })),
    });
  }

  // ?gid=... elige una pestaña; si no viene, usa SHEET_GID
  const tabs = sheets.map((s) => ({ title: s.getName(), gid: s.getSheetId() }));
  const gid = e.parameter.gid || props.getProperty("SHEET_GID");
  const sheet = sheets.find((s) => String(s.getSheetId()) === String(gid));
  if (!sheet) return json({ error: "Tab not found for gid " + gid, tabs: tabs });

  return json({ title: sheet.getName(), gid: sheet.getSheetId(), tabs: tabs, values: readValues(sheet, tz) });
}

// Las fechas se mandan como YYYY-MM-DD en la zona horaria de la hoja, para
// que no se corran de día al convertirlas a UTC.
function readValues(sheet, tz) {
  return sheet.getDataRange().getValues().map((row) =>
    row.map((cell) => (cell instanceof Date ? Utilities.formatDate(cell, tz, "yyyy-MM-dd") : cell))
  );
}

function json(data) {
  data.version = SCRIPT_VERSION;
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
