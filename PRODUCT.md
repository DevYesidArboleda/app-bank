# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

El dueño de un negocio de servicios que opera con Jobber. Abre el panel una o dos veces por semana, en computadora de escritorio, para entender cómo cerró cada semana (ventas contra payroll y gastos) y decidir cuánto efectivo tiene que tener disponible la semana siguiente.

## Product Purpose

Juntar en un solo lugar tres números que hoy viven en sistemas separados —ventas (Jobber), gastos bancarios (Chase vía SimpleFIN) y payroll— y convertirlos en un resultado semanal y una proyección de efectivo para la próxima semana. Éxito: el dueño responde "¿cuánto necesito la semana que viene y cómo voy?" en menos de un minuto, sin abrir Jobber, el banco ni Paychex.

## Positioning

No es un software contable ni un banco: es la vista semanal de caja de *este* negocio, cruzando fuentes que ninguna de las plataformas cruza por sí sola. La proyección es un cálculo propio (promedio de las últimas 4 semanas completas), no un dato de Jobber, Chase ni Paychex, y debe presentarse así.

## Operating Context

- Ritmo semanal; semanas comienzan en lunes (`weekStart` YYYY-MM-DD).
- Ventas = facturas de Jobber, mostradas en neto tras descontar impuestos (6.625%); la API también entrega bruto e impuestos.
- Gastos = transacciones de Chase vía SimpleFIN, agregadas por semana.
- Payroll se ingresa manualmente por semana mientras no haya acceso a las APIs de payroll de Paychex; se guarda en servidor (KV).
- Total semanal = ventas netas − payroll − gastos.
- La semana en curso está incompleta y no entra en el promedio de la proyección.

## Capabilities and Constraints

- Next.js 16 (App Router), React 19, Tailwind CSS 4. Leer `node_modules/next/dist/docs/` antes de usar APIs de Next.
- Integraciones activas: Jobber (OAuth, `/api/jobber/auth`) y SimpleFIN. Plaid y Paychex existen en código pero están pendientes; no presentarlas como conectadas.
- Endpoints clave: `/api/summary/weekly?weeks=N`, `/api/forecast/next-week`, `/api/payroll/weekly` (GET/POST), `/api/simplefin/accounts`.
- Usuario único (`demo-user`); no hay autenticación de usuarios todavía.
- Moneda USD, formato `en-US` para montos.

## Brand Commitments

Interfaz en español. No hay nombre comercial, logo ni identidad visual establecida.

## Evidence on Hand

Solo datos reales de las APIs. No hay testimonios, clientes ni métricas de marketing; no inventarlos.

## Product Principles

1. La pregunta semanal primero: cuánto efectivo se necesita y cómo cerró la semana.
2. Cada número dice de dónde viene (Jobber, banco, manual, estimación propia).
3. Lo manual debe ser obvio y rápido de corregir.
4. Honestidad sobre datos incompletos: semana en curso, fuentes caídas, integraciones pendientes.

## Accessibility & Inclusion

Sin requisitos específicos establecidos; aplicar WCAG AA como base. Positivo/negativo no puede depender solo del color.
