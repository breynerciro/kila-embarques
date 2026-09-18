# Después — Fase 3 (mismo protocolo que el baseline)

**Fecha:** 2026-09-18 · **App:** `http://localhost:5173` (dev · Vite 6.4.3) · **Browser:** Chromium 152 (headless) · **Dataset:** `public/embarques.json`, 50.000 registros (21 MB).

## Métrica 1 — Tiempo de aparición de la tabla (CPU 4×)

| Número | Antes | Después |
|--------|-------|---------|
| Tiempo hasta la primera fila | 105.437 ms | **1.469 ms (~72× más rápido)** |
| Filas renderizadas | 50.000 | **100** (paginadas de 500) |
| Nodos DOM en la página | 600.046 | **1.250** |
| Long task dominante | 54.934 ms | **566 ms** |
| Tarea total (TaskDuration) | 106 s | **1,5 s** |
| Heap usado tras carga | 272,9 MB | **30,5 MB** |

## Métrica 2 — Memoria: 20 ciclos /embarques ↔ /resumen (navegación SPA)

| Ciclo | Heap (MB) | Nodos DOM vivo | setInterval | Listeners resize |
|-------|-----------|----------------|-------------|------------------|
| 1     | 42,3      | 44             | 0           | 0                |
| 5     | 30,9      | 44             | 0           | 0                |
| 10    | 31,0      | 44             | 0           | 0                |
| 15    | 31,0      | 44             | 0           | 0                |
| 20    | 31,0      | 44             | 0           | 0                |

## Métrica 3 — Latencia de input del buscador (CPU 4×)

| Letra | Antes | Después |
|-------|-------|---------|
| m | 59.313 ms | 50 ms |
| u | 9.277 ms | 131 ms |
| n | 3.814 ms | 39 ms |
| o | 8.776 ms | 33 ms |
| z | 3.894 ms | 33 ms |
| **Total escribir "munoz"** | **85.075 ms** | **286 ms (~300× más rápido)** |

| Métrica de trace | Antes | Después |
|------------------|-------|---------|
| Long tasks durante la escritura | 10 (total ~74 s) | **1 (95 ms)** |
| Input delay máximo | 5.017 ms | **10,1 ms** |
| Input delay promedio | 315 ms | **1,03 ms** |
| Resultado del filtro | "2800 de 50000" | **"2800 de 50000"** |
