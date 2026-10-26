import { redirect } from "next/navigation";

// El panel vive en "/". Se conserva esta ruta porque el callback de Jobber
// redirige aquí (/dashboard?jobber=connected).
export default async function Dashboard({ searchParams }) {
  const params = await searchParams;
  redirect(params?.jobber === "connected" ? "/?jobber=connected" : "/");
}
