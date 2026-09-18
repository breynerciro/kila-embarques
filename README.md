# Embarques · Kila — Informe «La Tabla Que Se Pone Lenta»

Vista de embarques de la plataforma (buscar, filtrar por estado y ordenar por
fecha sobre 50.000 registros). Este README es el **informe final**: cada queja
con su causa, los números antes/después del mismo
protocolo de medición.

> **El proyecto corre dentro de `app-lenta/`** (es ahí donde vive `package.json`).
> Todos los comandos de abajo se ejecutan desde esa carpeta.

## Correr, testear, compilar

```bash
cd app-lenta
npm install
npm run dev       # abre http://localhost:5173
npm test          # vitest (5 tests de la lógica extraída)
npm run build     # vue-tsc --noEmit && vite build  → sin errores
```

Protocolo de medición reproducible y datos crudos en la carpeta raíz `mediciones/`:
[`BASELINE.md`](mediciones/BASELINE.md) (antes) ·
[`DESPUES.md`](mediciones/DESPUES.md) (después) · scripts `baseline.mjs`,
`ciclos.mjs`, `verificar.mjs`, `timers.mjs`.

---

## Queja 1 — «Abro embarques y me toca esperar»

**Causa** — `embarquesVisibles()` era una función (no `computed`) llamada **dos veces**
por render (conteo + `v-for`), que filtraba/ordenaba los 50K items por cada re-render
y montaba las **50.000 filas completas en el DOM** (~600.000 nodos). Además creaba
`new Intl.*` por celda.

**Cambio** — Lógica extraída a una función pura testable
(`src/utils/obtenerEmbarquesVisibles.ts`) consumida desde un único `computed`;
el texto buscable (cliente + referencia + documento) se **pre-normaliza una vez al
cargar**; formateadores `Intl.*` singleton; **paginación de 100 filas** con `:key="e.id"`
y el total filtrado visible.

| Métrica (CPU 4×) | Antes | Después |
|---|---|---|
| Primera fila | 105.437 ms | **1.469 ms** (~72×) |
| Filas / nodos DOM | 50.000 / 600.046 | **100 / 1.250** |
| Long task dominante | 54.934 ms | **566 ms** |
| Heap tras carga | 272,9 MB | **30,5 MB** |

## Queja 2 — «Después de un rato se pone lenta; si cierro y vuelvo, queda buena»

**Causa** — `setInterval` cada 3 s (iterando los 50K) **sin `clearInterval`** y un listener
`resize` **sin cleanup** en `useEmbarques.ts`; cada visita a `/embarques` acumulaba
1+1. Un `watch(..., { deep: true })` de los 50K objetos solo servía para un `console.log`.

**Cambio** — `shallowRef` (los objetos internos no necesitan proxies); `vencidos` pasa a
ser un valor derivado recalculado solo al cambiar el día (un `setTimeout` a medianoche,
**limpiado en `onUnmounted`**); se eliminó el listener `resize`, el `anchoVentana` y el
`deep watch`. La carga del JSON se comparte en una **promesa a nivel de módulo**
(`cargarEmbarques()`), así `ResumenView` no vuelve a descargar/parsear los 21 MB.

| 20 ciclos → resumen | Antes | Después |
|---|---|---|
| Heap | 164 → **2.696 MB** (+16×) | 42 → **31 MB** (plano; doble GC, ver `ciclos.mjs`) |
| Nodos | 1,1 M → **22,0 M** | DOM vivo **44 → 44** (la vista se desmonta, 0 tablas restantes) |
| `setInterval` vivos | 2 → **21** | **0** (el «1» del dev es el heartbeat de Vite; en build: 0) |
| Listener `resize` | 1 → **20** | **0** |
| Timer de medianoche | — | 1 en `/embarques`, **0 al salir** (se limpia) |

## Queja 3 — «Escribo en el buscador y las letras salen tarde»

**Causa** — cada tecla re-ejecutaba el filtrado+orden de 50K y re-renderizaba el
resultado completo en el DOM, síncrono en el hilo principal (agravado por los
intervals acumulados de la queja 2).

**Cambio** — la búsqueda ahora corre sobre el **texto pre-normalizado** dentro de un
`computed` cacheado y solo re-renderiza la **página actual** (≤ 100 filas).

| Métrica (CPU 4×) | Antes | Después |
|---|---|---|
| Total escribir «munoz» | 85.075 ms | **286 ms** (~300×) |
| Peor letra | 59.313 ms | **131 ms** |
| Long tasks en escritura | 10 (~74 s) | **1 (95 ms)** |
| Input delay máx. / prom. | 5.017 / 315 ms | **10,1 / 1,03 ms** |
| Resultado | «2800 de 50000» | «2800 de 50000» (idéntico) |

---

## Buscar, filtrar, ordenar siguen funcionando (tests)

`src/utils/obtenerEmbarquesVisibles.spec.ts` (5 tests, `npm test`):

1. Búsqueda encuentra al cliente correcto.
2. `"munoz"` encuentra `"  Muñoz  "` (acentos, mayúsculas, espacios) y los campos
   vacíos/nulos no rompen el filtro (incluye `eta: null` — el tipo se actualizó a
   `string | null` porque los datos reales tienen 260 registros con `eta` nula).
3. Ordenar por ETA **conserva** los registros con `eta: null` (no los descarta).
4. Búsqueda + filtro de estado + orden combinados; el filtro normaliza estados
   (así `EN_TRANSITO` del export responde a `en_transito` del select).

Verificación funcional en navegador (`verificar.mjs`): paginación real (Página 1
`SHIP-0001000…` / Página 2 `SHIP-0001100…`, «Página 2 de 500»), orden por ETD, y
`munoz → Importaciones Muñoz S.A.S.`.

## Lo que se intentó y no funcionó

- **Un solo `HeapProfiler.collectGarbage` no alcanzaba** en Chromium headless para
  reflejar la estabilidad de los 20 ciclos (el contador de nodos seguía creciendo con
  basura de los 50K objetos descartados por montaje). Con **doble GC + espera**
  (`ciclos.mjs`) la curva es plana y coincide con el DOM vivo.

## Lo que queda para una segunda pasada

- **Virtualización vs. paginación**: la paginación es el cambio quirúrgico pedido (sin
  librerías nuevas); un `vue-virtual-scroller` reescribiría el template y no se
  intentó por regla. Si el export creciera mucho, sería el siguiente paso.
- **Datos sucios del export**: el export trae estados `""`, `"undefined"` y
  `"EN_TRANSITO"` (normalizado por el filtro), pero `""`/`"undefined"` solo aparecen
  en «Todos los estados». La limpieza real sería en la generación del export.
- **Debounce/worker** en búsquedas kilométricas: hoy 286 ms alcanza, pero un
  `requestIdleCallback` o `computed` por debounce mantendrían la UI fluida si el
  dataset siguiera creciendo.
- **Persistir `diasParaEta` y `vencidos`** con una única fuente de tiempo (hoy se
  recalcula al cambiar el día vía `setTimeout` a medianoche, sin intervalos).

## Estructura

```
app-lenta/
  public/embarques.json                       los datos (50.000 · 21 MB)
  src/
    utils/obtenerEmbarquesVisibles.ts         función pura: normalizar + filtrar + ordenar
    utils/obtenerEmbarquesVisibles.spec.ts    tests
    views/EmbarquesView.vue                   la tabla (computed + paginación)
    views/ResumenView.vue                     conteo por estado (carga compartida)
    composables/useEmbarques.ts               carga cacheada + vencidos derivados
    tipos.ts                                  Embarque / EmbarqueVista (eta: string | null)
```
