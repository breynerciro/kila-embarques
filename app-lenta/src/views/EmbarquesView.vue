<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEmbarques } from '../composables/useEmbarques'
import { obtenerEmbarquesVisibles } from '../utils/obtenerEmbarquesVisibles'
import type { EmbarqueVista } from '../tipos'

const { embarques, cargando, vencidos } = useEmbarques()

const busqueda = ref('')
const estadoSeleccionado = ref('')
const ordenCampo = ref<'' | 'etd' | 'eta'>('')
const ordenAsc = ref(true)
const pagina = ref(1)

const TAMANO_PAGINA = 100
const ESTADOS = ['pendiente', 'en_transito', 'en_puerto', 'nacionalizacion', 'entregado', 'cancelado']

const filtrados = computed<EmbarqueVista[]>(() =>
  obtenerEmbarquesVisibles(embarques.value, {
    busqueda: busqueda.value,
    estado: estadoSeleccionado.value,
    ordenCampo: ordenCampo.value,
    ordenAsc: ordenAsc.value
  })
)

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / TAMANO_PAGINA)))
const paginaActual = computed(() => Math.min(Math.max(1, pagina.value), totalPaginas.value))
const paginados = computed(() => {
  const inicio = (paginaActual.value - 1) * TAMANO_PAGINA
  return filtrados.value.slice(inicio, inicio + TAMANO_PAGINA)
})

watch([busqueda, estadoSeleccionado, ordenCampo, ordenAsc], () => {
  pagina.value = 1
})

const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const formatoPeso = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function formatearFecha(iso: string | null) {
  if (!iso) return '—'
  return formatoFecha.format(new Date(iso + 'T00:00:00'))
}

function formatearPeso(kg: number) {
  return formatoPeso.format(kg) + ' kg'
}

function ordenarPor(campo: 'etd' | 'eta') {
  if (ordenCampo.value === campo) ordenAsc.value = !ordenAsc.value
  else {
    ordenCampo.value = campo
    ordenAsc.value = true
  }
}

function anterior() {
  if (paginaActual.value > 1) pagina.value = paginaActual.value - 1
}

function siguiente() {
  if (paginaActual.value < totalPaginas.value) pagina.value = paginaActual.value + 1
}
</script>

<template>
  <section class="vista">
    <header class="encabezado">
      <h1>Embarques</h1>
      <span class="vencidos" v-if="vencidos">{{ vencidos }} con ETA vencida</span>
    </header>

    <div class="controles">
      <input v-model="busqueda" type="search" placeholder="Buscar por cliente, referencia o documento" />
      <select v-model="estadoSeleccionado">
        <option value="">Todos los estados</option>
        <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
      </select>
      <span class="conteo">{{ filtrados.length }} de {{ embarques.length }}</span>
    </div>

    <p v-if="cargando" class="nota">Cargando…</p>

    <div v-else class="tabla-scroll">
      <table>
        <thead>
          <tr>
            <th>Embarque</th>
            <th>Referencia</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Origen</th>
            <th>Destino</th>
            <th class="orden" @click="ordenarPor('etd')">ETD</th>
            <th class="orden" @click="ordenarPor('eta')">ETA</th>
            <th>Documento</th>
            <th>Peso</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in paginados" :key="e.id">
            <td>{{ e.id }}</td>
            <td>{{ e.referencia }}</td>
            <td>{{ e.cliente }}</td>
            <td><span class="pill">{{ e.estadoLegible }}</span></td>
            <td>{{ e.origen }}</td>
            <td>{{ e.destino }}</td>
            <td>{{ formatearFecha(e.etd) }}</td>
            <td>{{ formatearFecha(e.eta) }}</td>
            <td>{{ e.documento }}</td>
            <td>{{ formatearPeso(e.pesoKg) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="paginador" v-if="!cargando">
      <button :disabled="paginaActual <= 1" @click="anterior">← Anterior</button>
      <span>Página {{ paginaActual }} de {{ totalPaginas }}</span>
      <button :disabled="paginaActual >= totalPaginas" @click="siguiente">Siguiente →</button>
    </footer>
  </section>
</template>
