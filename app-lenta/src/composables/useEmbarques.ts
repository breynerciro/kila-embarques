import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import type { Embarque, EmbarqueVista } from '../tipos'

const DIA = 86400000

let promesaEmbarques: Promise<Embarque[]> | null = null

export function cargarEmbarques(): Promise<Embarque[]> {
  if (!promesaEmbarques) {
    promesaEmbarques = fetch('/embarques.json')
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`Error al cargar embarques: HTTP ${respuesta.status}`)
        return respuesta.json() as Promise<Embarque[]>
      })
      .catch((error) => {
        promesaEmbarques = null
        throw error
      })
  }
  return promesaEmbarques
}

function contarVencidos(embarques: EmbarqueVista[], hoy: number): number {
  let cuenta = 0
  for (const e of embarques) {
    if (e.eta && new Date(e.eta + 'T00:00:00').getTime() < hoy && e.estado !== 'entregado') cuenta++
  }
  return cuenta
}

export function useEmbarques() {
  const embarques = shallowRef<EmbarqueVista[]>([])
  const cargando = ref(true)
  const error = ref<string | null>(null)
  const vencidos = ref(0)

  let timerVencidos: number | undefined

  function actualizarVencidos() {
    vencidos.value = contarVencidos(embarques.value, Date.now())
  }

  function programarSiguienteActualizacion() {
    clearTimeout(timerVencidos)
    const ahora = new Date()
    const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
    timerVencidos = window.setTimeout(() => {
      actualizarVencidos()
      programarSiguienteActualizacion()
    }, manana.getTime() - ahora.getTime())
  }

  onMounted(async () => {
    try {
      const datos = await cargarEmbarques()
      const hoy = Date.now()

      embarques.value = datos.map((e): EmbarqueVista => ({
        ...e,
        contenedores: e.contenedores,
        diasParaEta: e.eta ? Math.round((new Date(e.eta + 'T00:00:00').getTime() - hoy) / DIA) : null,
        estadoLegible: (e.estado || 'sin estado').replace(/_/g, ' '),
        resumenContenedores: e.contenedores.length ? e.contenedores.join(', ') : 'sin asignar',
      }))

      actualizarVencidos()
      cargando.value = false
      programarSiguienteActualizacion()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar los embarques'
      cargando.value = false
    }
  })

  onUnmounted(() => {
    clearTimeout(timerVencidos)
  })

  return { embarques, cargando, error, vencidos }
}
