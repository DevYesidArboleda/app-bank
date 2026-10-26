import { NextResponse } from "next/server";
import { paychexGet } from "@/lib/paychex";

// GET /api/paychex/all-company-data
// Trae TODA la data disponible de la cuenta: todas las compañías, todos los
// workers de cada una, y su compensación + historial de pagos.
// Requiere que la app tenga scopes de compañía completa (no solo un worker).
export async function GET() {
  try {
    const companiesData = await paychexGet("/companies");
    const companies = companiesData?.content ?? companiesData ?? [];
    const companyList = Array.isArray(companies) ? companies : [companies];

    if (companyList.length === 0) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    // Recorremos cada compañía y cada worker dentro de ella
    const results = await Promise.all(
      companyList.map(async (company) => {
        const companyId = company.companyId ?? company.id;

        const workersData = await paychexGet(`/companies/${companyId}/workers`).catch((e) => ({
          error: e.message,
        }));
        const workers = workersData?.content ?? workersData ?? [];
        const workerList = Array.isArray(workers) ? workers : [];

        // Para cada worker, traemos compensación y pagos en paralelo
        const workersWithDetails = await Promise.all(
          workerList.map(async (worker) => {
            const workerId = worker.workerId ?? worker.id;

            const [compensation, checks] = await Promise.all([
              paychexGet(`/companies/${companyId}/workers/${workerId}/compensation`).catch(
                (e) => ({ error: e.message })
              ),
              paychexGet(`/companies/${companyId}/workers/${workerId}/checks`).catch((e) => ({
                error: e.message,
              })),
            ]);

            return {
              workerId,
              name: worker.name,
              currentStatus: worker.currentStatus,
              compensation,
              payStatements: checks,
            };
          })
        );

        return {
          companyId,
          companyName: company.name,
          workerCount: workerList.length,
          workers: workersWithDetails,
        };
      })
    );

    return NextResponse.json({ companies: results });
  } catch (error) {
    console.error("Error en /api/paychex/all-company-data:", error);
    return NextResponse.json({ error: "Couldn't resolve the information" }, { status: 502 });
  }
}