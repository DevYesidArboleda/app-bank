import { NextResponse } from "next/server";
import { paychexGet } from "@/lib/paychex";

// GET /api/paychex/me
// Atajo pensado para cuentas donde solo hay UNA empresa y TÚ eres el único
// worker relevante: resuelve automáticamente companyId y workerId, y trae
// compensación + historial de pagos en una sola llamada.
export async function GET() {
  try {
    const companiesData = await paychexGet("/companies");
    const companies = companiesData?.content ?? companiesData ?? [];
    const company = Array.isArray(companies) ? companies[0] : companies;

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const companyId = company.companyId ?? company.id;

    const workersData = await paychexGet(`/companies/${companyId}/workers`);
    const workers = workersData?.content ?? workersData ?? [];
    const worker = Array.isArray(workers) ? workers[0] : workers;

    if (!worker) {
      return NextResponse.json({ error: "No worker found" }, { status: 404 });
    }

    const workerId = worker.workerId ?? worker.id;

    const [compensationData, checksData] = await Promise.all([
      paychexGet(`/companies/${companyId}/workers/${workerId}/compensation`).catch((e) => ({
        error: e.message,
      })),
      paychexGet(`/companies/${companyId}/workers/${workerId}/checks`).catch((e) => ({
        error: e.message,
      })),
    ]);

    return NextResponse.json({
      companyId,
      workerId,
      workerName: worker.name,
      compensation: compensationData,
      payStatements: checksData,
    });
  } catch (error) {
    console.error("Error en /api/paychex/me:", error);
    return NextResponse.json({ error: "Couldn't resolve the information" }, { status: 502 });
  }
}