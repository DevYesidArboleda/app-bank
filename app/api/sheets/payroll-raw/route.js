// Endpoint TEMPORAL para verificar la conexión con Google Sheets y ver la
// estructura de las pestañas de payroll. Borrar cuando /api/payroll/weekly
// ya lea de la hoja.
import { NextResponse } from "next/server";
import { getPayrollSheet } from "@/lib/googleSheets";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gid = searchParams.get("gid") || undefined;

  try {
    const { scriptVersion, title, gid: tabGid, tabs, values } = await getPayrollSheet({ gid });

    // Grilla legible: cada fila con su número de fila en la hoja y sin las
    // celdas vacías del final; se omiten las filas completamente vacías
    const rows = values
      .map((row, i) => {
        let end = row.length;
        while (end > 0 && (row[end - 1] === "" || row[end - 1] == null)) end--;
        return { row: i + 1, cells: row.slice(0, end) };
      })
      .filter((r) => r.cells.length > 0);

    return NextResponse.json({ scriptVersion, title, gid: tabGid, tabs, rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
