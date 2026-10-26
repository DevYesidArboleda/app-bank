// Semanas fijas de sábado a viernes, iguales a los períodos de la hoja de
// payroll (una pestaña por semana, ej. "PAY_OCT 03 - OCT 09"). Todas las
// fuentes (Jobber, SimpleFIN, payroll) agrupan con esto para que el mismo
// weekStart signifique lo mismo en todas.
//
// Las fechas se manejan como claves "YYYY-MM-DD" en la zona horaria del
// negocio, no la del servidor (en Vercel el servidor está en UTC y un pago
// del viernes a las 9pm caería en sábado).

const BUSINESS_TZ = "America/New_York";
const WEEK_START_DAY = 6; // sábado (0 = domingo)

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Date, ISO con hora, o "YYYY-MM-DD" -> "YYYY-MM-DD" en la zona del negocio.
// Un "YYYY-MM-DD" ya es un día calendario y se deja tal cual.
export function dateKey(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return keyFormatter.format(new Date(value));
}

export function addDays(key, days) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Sábado de la semana que contiene ese día
export function weekStartOf(value) {
  const key = dateKey(value);
  const day = new Date(`${key}T00:00:00Z`).getUTCDay();
  return addDays(key, -((day - WEEK_START_DAY + 7) % 7));
}

// Las últimas `weeksBack` semanas, de la más vieja a la actual (en curso):
// [{ weekStart, weekEnd }] con weekEnd = viernes.
export function lastWeeks(weeksBack, now = new Date()) {
  const current = weekStartOf(now);
  const weeks = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = addDays(current, -7 * i);
    weeks.push({ weekStart, weekEnd: addDays(weekStart, 6) });
  }
  return weeks;
}
