# Baseline — Fase 1 (antes de tocar nada)

**Fecha:** 2026-09-18 · **App:** `http://localhost:5173` (dev · Vite 6.4.3) · **Browser:** Chromium 152 (headless) · **Dataset:** `public/embarques.json`, 50.000 registros (21 MB).

## Métrica 1 — Tiempo de aparición de la tabla (CPU 4×)

| Número | Valor |
|--------|-------|
| Tiempo hasta la primera fila | **105.437 ms (~1 min 45 s)** |
| Filas renderizadas | 50.000 |
| Nodos DOM en la página | **600.046** (~12 nodos/fila) |
| Long task dominante | **54.934 ms** (54 s sin soltar el hilo) |
| Tarea total (TaskDuration) | 106 s |
| Heap usado tras carga | 272,9 MB |

## Métrica 2 — Memoria: 20 ciclos /embarques ↔ /resumen (navegación SPA)

| Ciclo | Heap usado (MB) | Nodos DOM | setInterval activos | Listeners resize |
|-------|-----------------|-----------|---------------------|------------------|
| 1     | 163,8           | 1,1 M     | 2                   | 1                |
| 5     | 700,5           | 5,5 M     | 6                   | 5                |
| 10    | 1.365,4         | 11,0 M    | 11                  | 10               |
| 15    | 2.047,5         | 16,5 M    | 16                  | 15               |
| 20    | **2.695,6**     | 22,0 M    | **21**              | **20**           |

**+2.532 MB** y **+16,4× nodos** en 20 ciclos.

## Métrica 3 — Latencia de input del buscador (CPU 4×)

| Letra | Latencia |
|-------|----------|
| m | 59.313 ms |
| u | 9.277 ms |
| n | 3.814 ms |
| o | 8.776 ms |
| z | 3.894 ms |
| **Total escribir "munoz"** | **85.075 ms** |

| Métrica de trace | Valor |
|------------------|-------|
| Long tasks durante la escritura | 10 (total **74 s**) |
| Input delay máximo | **5.017 ms** |
| Input delay promedio | 315 ms |
| Resultado del filtro | 2.800 de 50.000 |
