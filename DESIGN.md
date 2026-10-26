---
name: Caja semanal
description: Carta náutica de la caja del negocio; cada semana sube o baja respecto al nivel cero y la próxima se publica como predicción.
colors:
  magenta: "#b4237e"
  magenta-wash: "#f6e3ee"
  salidas: "#3d8fb3"
  surplus: "#2f6f4f"
  deficit: "#a63a2b"
  sand: "#e9d9a8"
  sand-deep: "#dcc88c"
  sand-ink: "#4a3f1c"
  paper: "#f7f5ee"
  paper-raised: "#fdfcf8"
  paper-sunk: "#efece2"
  ink: "#14202b"
  ink-lift: "#22313f"
  ink-2: "#3e4c59"
  ink-3: "#5c6873"
  rule: "#d8d2bf"
  rule-soft: "#e7e2d3"
typography:
  display:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  figure:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    fontFeature: "tnum"
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  hair: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  pane: "22px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.ink-lift}"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  segmented-option:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  segmented-option-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-raised}"
  rail-link:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.sand-ink}"
    rounded: "{rounded.md}"
    padding: "7px 8px"
  rail-link-active:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
  pane-grid:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px 22px 22px"
  input-money:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "30px"
  row-selected:
    backgroundColor: "{colors.magenta-wash}"
    textColor: "{colors.ink}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-raised}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Caja semanal

## Overview

**Creative North Star: "La tabla de mareas"**

La caja del negocio se lee como una carta náutica: papel claro, tinta azul-negra, tierra de arena a la izquierda y una sola línea de nivel cero ($0) contra la que cada semana sube o baja. Lo observado se dibuja con trazo sólido; lo que todavía no ocurrió se publica como predicción, en magenta de sobreimpresión y trazo punteado. El sistema es denso y de trabajo: filetes de 1px, cifras tabulares monoespaciadas alineadas al margen derecho, y ningún adorno que no sea una medida.

El color se gana. La interfaz descansa en papel y tinta; el magenta marca solo la predicción y la selección, el verde y el rojo ladrillo solo el signo de un resultado. Seleccionar una semana (en la curva o en la tabla) la decodifica a todo color; el resto queda en tinta atenuada.

El sistema rechaza la fila de tarjetas KPI con degradado: los paneles son celdas de una misma retícula separadas por filetes, no tarjetas flotantes.

**Key Characteristics:**
- Papel cálido (#f7f5ee) y tinta azul-negra; la barra lateral de arena es la "tierra" de la carta.
- Filetes de 1px como estructura; superficies planas.
- Todas las cifras en JetBrains Mono tabular; el texto en Public Sans compacta.
- Magenta reservado a predicción y selección; verde/rojo ladrillo solo para el signo del resultado, siempre con + o −.
- Observado = sólido, predicho = punteado.

## Colors

Una carta impresa: papel y tinta casi monocromos con tres tintas de señal de uso estricto.

### Primary
- **Magenta de sobreimpresión** (magenta): la predicción (monto grande, tramo punteado y rombo de la curva, rótulo "Predicción", relleno de la barra necesidad-vs-saldo), la selección (contorno de foco, banda de semana elegida, botón "Agregar" de la fila seleccionada), el cursor de texto y `::selection`.
- **Lavado magenta** (magenta-wash): fondo de la fila y de la banda de la semana seleccionada.

### Secondary
- **Azul de salidas** (salidas): la serie payroll + gastos en la curva, en las barras de desglose y en las muestras de leyenda. Al 28% de opacidad es el relleno "bajío" donde las salidas superan a las ventas; al 45–50% distingue gastos de payroll.

### Tertiary
- **Arena** (sand): fondo de la barra lateral, la tierra de la carta. **Arena profunda** (sand-deep) es su filete; **tinta de arena** (sand-ink) es el texto sobre ella.

### Semánticos
- **Verde profundo** (surplus): resultado positivo, fuente conectada, veredicto de holgura (sobre su lavado al 14%).
- **Rojo ladrillo** (deficit): resultado negativo, fuente con error, alertas y veredicto de faltante (sobre su lavado al 12%); la barra de capacidad excedida se raya en diagonal con este rojo.

### Neutral
- **Papel** (paper): fondo de página.
- **Papel elevado** (paper-raised): interior de la retícula de paneles, botones secundarios, enlace activo de la barra lateral.
- **Papel hundido** (paper-sunk): pista de la barra de capacidad, hover del control segmentado, esqueletos, veredicto neutro.
- **Tinta** (ink): texto principal, línea de ventas netas, línea de $0, botón primario. **Tinta levantada** (ink-lift) es solo su hover.
- **Tinta 2** (ink-2): etiquetas de términos y texto secundario. **Tinta 3** (ink-3): notas, encabezados de tabla, ejes, sondeos no seleccionados.
- **Filete** (rule): bordes de retícula, botones y separadores mayores. **Filete suave** (rule-soft): divisiones entre filas y la retícula del gráfico.

### Named Rules
**The Sobreimpresión Rule.** El magenta significa "predicho" o "elegido", nada más. Nunca decora, nunca es un acento de marca genérico.

**The Signo Rule.** Un monto negativo lleva rojo ladrillo y el signo − (U+2212); uno positivo, verde y +. El color nunca es la única señal.

**The Una Semana a Todo Color Rule.** Solo la semana activa muestra sus sondeos en verde/rojo y sus marcadores llenos; el resto queda en tinta 3.

## Typography

**Display Font:** JetBrains Mono (con ui-monospace, SFMono-Regular, monospace)
**Body Font:** Public Sans (con ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono para toda cifra

**Character:** Una sans de trabajo compacta para leer y una mono tabular para medir; el número más importante de la pantalla se compone en mono, no en una display decorativa.

### Hierarchy
- **Display** (600, 2.75rem, 1; 2.25rem bajo 860px): solo el monto de la predicción, en magenta, con los centavos a media escala y elevados.
- **Headline** (700, 1.75rem, 1.15, -0.02em, `text-wrap: balance`): el título de la semana en curso.
- **Title** (700, 1rem, -0.01em): encabezados de panel y nombre de la marca.
- **Body** (400, 0.875rem, 1.5): texto corrido y celdas de semana; notas al pie limitadas a 72ch, base de predicción a 34ch.
- **Figure** (400–700, 0.8125rem, tabular): montos de tabla, términos, saldos, tooltip. Los sondeos de la curva usan mono itálica 600 a 11px.
- **Label** (500–600, 0.75rem): notas de panel, encabezados de tabla, estado de fuentes, leyenda. Sin mayúsculas forzadas ni tracking abierto.

### Named Rules
**The Cifra Tabular Rule.** Todo monto va en mono tabular y alineado a la derecha; `font-variant-numeric: tabular-nums` está activo en todo el cuerpo.

## Layout

Escritorio primero. Una barra lateral fija de 232px (arena, sticky a 100dvh) y una columna principal con padding 26px 32px 56px. El contenido vive en retículas de 12 columnas sin gap, con borde de filete y radio de 8px; los paneles se separan por filetes internos de 1px, no por espacio (proporciones observadas 5/7 en la banda de predicción y 8/4 en la tabla). Panel interior: 20px 22px 22px; la tabla sangra hasta el borde del panel y recupera 22px en la primera y última columna. Ritmo: 8 / 12 / 16 / 22 / 24px.

- **≤1180px:** los paneles se apilan a ancho completo con filete superior; la predicción y la columna derecha pasan a dos columnas internas.
- **≤860px:** la barra lateral se vuelve una franja superior horizontal (sin fuentes ni pie), la columna principal toma padding 20px 16px, los paneles 18px 16px.
- **≤520px:** la navegación ocupa el ancho; la tabla oculta ventas y gastos y lleva las ventas como segunda línea bajo la semana, filas de 56px.

## Elevation & Depth

Plano por defecto. La profundidad es tonal (papel / papel elevado / papel hundido) y estructural (filetes). Solo las capas transitorias que flotan sobre el contenido llevan sombra difusa en tinta: el tooltip de la curva y el toast.

### Shadow Vocabulary
- **Tooltip** (`box-shadow: 0 6px 18px rgba(20, 32, 43, 0.12)`): ficha flotante de la semana bajo el puntero.
- **Toast** (`box-shadow: 0 10px 30px rgba(20, 32, 43, 0.25)`): confirmación o error al pie de la pantalla.

### Named Rules
**The Carta Plana Rule.** Paneles, botones, filas y barras no proyectan sombra. Si algo no flota sobre el contenido, se separa con un filete.

## Shapes

Esquinas apenas suavizadas: 8px para la retícula contenedora, 6px para botones, control segmentado, veredictos, estados y toast; 4px para controles internos (opciones segmentadas, campo de monto, botón de icono, disparador de payroll); 2–3px para muestras y etiquetas. Las barras de medida son rectas a la izquierda (arrancan de un filete de origen) y redondeadas 2px a la derecha.

El trazo discontinuo es parte del lenguaje: marca lo provisional o lo vacío (estado vacío, "Agregar" payroll, etiqueta "en curso", fuente pendiente, línea de predicción). Los iconos son propios: caja 16×16, trazo 1.6, extremos redondeados.

## Components

### Buttons
- **Shape:** suavemente redondeado (6px), alto 32px (28px en la variante pequeña), padding horizontal 12px, label 600.
- **Primary:** tinta sobre papel elevado; hover a tinta levantada. Una acción primaria por bloque.
- **Secondary:** papel elevado con filete; hover oscurece el borde a tinta 3. En espera, el icono gira y el cursor pasa a `progress`.
- **Icon button:** 30×30, radio 4px, misma lógica primario/secundario.

### Control segmentado
- **Style:** contenedor de papel elevado con filete y 2px de padding; opciones de 4px de radio.
- **State:** activa = tinta llena con texto papel; hover = papel hundido. Elige el horizonte (4/8/12 semanas).

### Navigation
- **Style:** enlaces de 7px 8px sobre arena, texto tinta de arena 500 con icono al 80%.
- **States:** hover = blanco al 35% y texto tinta; activo = papel elevado con contorno interior de arena profunda.
- **Fuentes:** lista bajo la navegación con un punto de 8px por fuente: lleno verde (conectada), lleno rojo (error), hueco magenta (manual), discontinuo (pendiente), pulso (cargando).

### Cards / Containers
- **Corner Style:** 8px solo en la retícula exterior.
- **Background:** papel elevado.
- **Shadow Strategy:** ninguna (ver Carta Plana).
- **Border:** filete de 1px por fuera y entre paneles.
- **Internal Padding:** 20px 22px 22px.

### Inputs / Fields
- **Style:** campo de monto en línea, 30px de alto, borde de tinta, fondo blanco, radio 4px, cifra mono alineada a la derecha con prefijo $ en tinta 3; confirmación y cancelación como botones de icono.
- **Disparador:** el monto de payroll es un botón transparente que al hover/foco muestra filete y lápiz; vacío, es un "Agregar" discontinuo que se vuelve magenta en la fila seleccionada.
- **Focus:** contorno magenta de 2px con 2px de separación en todo elemento enfocable.

### Tabla semanal
Filas de 44px con filete suave, montos en mono a la derecha, semana en sans 600. Hover = tinta al 2.5%; seleccionada = lavado magenta. El resultado va en 700 con signo y color.

### Veredicto y estados
- **Veredicto:** bloque de 6px de radio sin borde sobre lavado verde (holgura), lavado rojo (faltante) o papel hundido (neutro), con icono y cifra en mono.
- **Estado vacío/error:** borde discontinuo de filete, icono, título en tinta y acción; en error, borde rojo al 40% y fondo al 4%.
- **Carga:** esqueletos de papel hundido a filete suave con barrido.

### Curva de mareas (signature)
SVG de 280px de alto. Línea de $0 en tinta a 1.5px; retícula en filete suave; eje en mono 10.5px. Ventas netas en tinta y salidas en azul, ambas a 2px con curva monótona; relleno verde al 16% donde las ventas superan las salidas y azul al 28% donde las salidas superan las ventas. Bajo la línea cero, los sondeos: el neto de cada semana en mono itálica, a color solo en la semana elegida. La semana en curso lleva un rayado de tinta al 7%; la columna predicha, rayado magenta al 22%, tramo punteado (4 4) y rombo magenta con su cifra. Las líneas se dibujan en 1100ms y los rellenos aparecen después.

### Barras de medida
Desglose de la semana: cada fila es etiqueta, barra y cifra; todas las barras comparten una sola escala, con marcas al 25% y origen en un filete de tinta 3. Ventas en tinta, impuestos en gris, payroll en azul, gastos en azul al 50%, resultado en verde o rojo.

## Do's and Don'ts

### Do:
- **Do** reservar el magenta (#b4237e) para la predicción y la selección.
- **Do** escribir todo monto en JetBrains Mono tabular, alineado a la derecha, con − (U+2212) o + cuando lleva signo.
- **Do** separar paneles con filetes de 1px (#d8d2bf) dentro de una sola retícula de 8px de radio.
- **Do** dibujar lo observado con trazo sólido y lo predicho o pendiente con trazo discontinuo.
- **Do** dar a las barras de una misma vista una sola escala compartida.
- **Do** usar la curva `cubic-bezier(0.16, 1, 0.3, 1)` a 160ms para estados y respetar `prefers-reduced-motion`.

### Don't:
- **Don't** armar filas de tarjetas KPI con degradado.
- **Don't** poner sombra en paneles, botones o filas; solo tooltip y toast flotan.
- **Don't** usar verde o rojo ladrillo como decoración ni comunicar un signo solo con color.
- **Don't** colorear todas las semanas a la vez; solo la activa va a todo color.
