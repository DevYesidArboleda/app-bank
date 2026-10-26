---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/dashboard/page.jsx"]
---

# Panel semanal de caja (/)

Scope: la ruta `/` es el panel; `/dashboard` muestra lo mismo. Visitor mode: Operate.
Audiencia/tarea: el dueño, revisión semanal en escritorio — ¿cuánto efectivo necesito la próxima semana y cómo cerró cada semana? Ajusta el payroll manual.
Contenido confirmado: proyección próxima semana, curva de tendencia 8 semanas (ventas/payroll/gastos/neto), desglose de ventas (bruto, impuestos 6.625%, neto), saldos bancarios SimpleFIN, tabla semanal con payroll editable.
Build path: code-led (sin generación de imágenes).

## Direction contract

THESIS: La caja del negocio como una tabla de mareas: cada semana el neto sube o baja respecto al nivel cero ($0), lo observado se dibuja sólido y la próxima semana se publica como predicción. Rechaza la fila de tarjetas KPI con degradado.

OWN-WORLD: Carta náutica: fondo papel claro #F7F5EE, tinta azul-negra #14202B, arena #E9D9A8 para la barra lateral (tierra), azul bajío #BFDDE8 para zonas bajo cero/gastos, magenta de sobreimpresión #B4237E reservado a la predicción y la selección, verde profundo para superávit. Filetes de 1px, sin sombras. Cifras tabulares monoespaciadas. Sans de trabajo compacta. Estado de pérdida: rojo ladrillo #A63A2B para cifras negativas y alertas, siempre con signo −; aprobado por el usuario ("Mantener el rojo"). Relleno del gráfico cuando las salidas superan las ventas: azul bajío.

STORY: El dueño ve primero cuánto necesita la próxima semana y contra qué saldo, luego cómo vino la marea las últimas 8 semanas, y corrige el payroll de cualquier semana en la tabla.

FIRST VIEWPORT: Barra lateral arena a la izquierda (marca, navegación Panel/Fuentes, estado de fuentes Jobber·SimpleFIN conectados, Payroll manual). Arriba del área principal: título de la semana actual y botón Actualizar. Banda principal: a la izquierda la predicción (monto grande, desglose payroll+gastos, saldo disponible y holgura); a la derecha la curva de mareas de 8 semanas + semana predicha punteada en magenta sobre la línea de $0. Debajo: tabla semanal; columna derecha saldos bancarios.

FORM: Tabla de mareas, candidato 7 de la lista ordenada; seed key 21affb12. Signature move: la curva de marea del neto semanal con la semana predicha en magenta punteado; seleccionar una semana (curva o tabla) la decodifica a todo color y rellena el desglose. Raises: filetes+cifras tabulares (Consola oscura); barras de longitud exacta (Labanotación); solo la semana activa a todo color (Catálogo Factory); montos apretados al margen derecho y "no desbordar" = necesidad vs saldo (J-card).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
