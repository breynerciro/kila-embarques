import type { EmbarqueVista } from '../tipos'

export type CampoOrden = '' | 'etd' | 'eta'

export interface FiltroEmbarques {
  busqueda: string
  estado: string
  ordenCampo: CampoOrden
  ordenAsc: boolean
}

export function normalizar(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function construirTextoBusqueda(e: Pick<EmbarqueVista, 'cliente' | 'referencia' | 'documento'>): string {
  return [e.cliente, e.referencia, e.documento].map(normalizar).join(' ')
}

export function obtenerEmbarquesVisibles(items: EmbarqueVista[], filtro: FiltroEmbarques): EmbarqueVista[] {
  const q = normalizar(filtro.busqueda).trim()

  let lista = q
    ? items.filter((e) => (e.textoBusqueda ?? construirTextoBusqueda(e)).includes(q))
    : items

  if (filtro.estado) {
    const estado = normalizar(filtro.estado)
    lista = lista.filter((e) => normalizar(e.estado) === estado)
  }

  if (!filtro.ordenCampo) return lista

  const campo = filtro.ordenCampo
  const dir = filtro.ordenAsc ? 1 : -1
  return [...lista].sort((a, b) => {
    const va = a[campo] || ''
    const vb = b[campo] || ''
    return va.localeCompare(vb) * dir
  })
}
