import { describe, it, expect } from 'vitest'
import {
  normalizar,
  construirTextoBusqueda,
  obtenerEmbarquesVisibles,
  type FiltroEmbarques,
} from './obtenerEmbarquesVisibles'
import type { EmbarqueVista } from '../tipos'

const base: FiltroEmbarques = { busqueda: '', estado: '', ordenCampo: '', ordenAsc: true }

function crearEmbarque(parcial: Partial<EmbarqueVista> & { id: string }): EmbarqueVista {
  const item: EmbarqueVista = {
    referencia: '',
    cliente: '',
    estado: '',
    modo: '',
    origen: '',
    destino: '',
    incoterm: '',
    etd: '2026-01-01',
    eta: '2026-02-01',
    documento: '',
    contenedores: [],
    pesoKg: 0,
    valorFob: 0,
    diasParaEta: null,
    estadoLegible: '',
    resumenContenedores: '',
    ...parcial,
  }
  item.textoBusqueda = construirTextoBusqueda(item)
  return item
}

describe('obtenerEmbarquesVisibles', () => {
  it('filtra por texto y encuentra al cliente correcto', () => {
    const lista = [
      crearEmbarque({ id: '1', cliente: 'Insumos Médicos Cúcuta S.A.' }),
      crearEmbarque({ id: '2', cliente: 'Café del Quindío' }),
      crearEmbarque({ id: '3', cliente: 'Muñoz y CIA' }),
    ]
    const resultado = obtenerEmbarquesVisibles(lista, { ...base, busqueda: 'insumos' })
    expect(resultado.map((e) => e.id)).toEqual(['1'])
  })

  it('"munoz" encuentra "  Muñoz  " y los campos vacíos o nulos no rompen el filtro', () => {
    const sinPrecomputar: EmbarqueVista = {
      id: '4',
      referencia: ' KTR-9 ',
      cliente: '  Muñoz  y  CIA  ',
      estado: 'pendiente',
      modo: 'maritimo',
      origen: '',
      destino: '',
      incoterm: '',
      etd: '2026-01-01',
      eta: null,
      documento: '  ',
      contenedores: [],
      pesoKg: 0,
      valorFob: 0,
      diasParaEta: null,
      estadoLegible: 'pendiente',
      resumenContenedores: '',
    }
    const inutilizable = crearEmbarque({ id: '5', cliente: '', referencia: '', documento: '' })

    const resultado = obtenerEmbarquesVisibles([sinPrecomputar, inutilizable], { ...base, busqueda: '  MUNOZ  ' })
    expect(resultado.map((e) => e.id)).toEqual(['4'])
    expect(resultado[0].cliente).toContain('Muñoz')

    const fallback = obtenerEmbarquesVisibles([sinPrecomputar, inutilizable], { ...base, busqueda: 'munoz' })
    expect(fallback.map((e) => e.id)).toEqual(['4'])
  })

  it('normalizar tolera valores vacíos o nulos', () => {
    expect(normalizar('  MuñOz  ')).toBe('  munoz  ')
    expect(normalizar('')).toBe('')
    expect(normalizar(null)).toBe('')
    expect(normalizar(undefined)).toBe('')
  })

  it('ordenar por ETA conserva los registros cuya ETA es null', () => {
    const lista = [
      crearEmbarque({ id: 'a', etd: '2026-01-10', eta: '2026-02-05' }),
      crearEmbarque({ id: 'b', etd: '2026-01-01', eta: null }),
      crearEmbarque({ id: 'c', etd: '2026-01-05', eta: '2026-02-01' }),
    ]

    const ascendente = obtenerEmbarquesVisibles(lista, { ...base, ordenCampo: 'eta', ordenAsc: true })
    expect(ascendente.map((e) => e.id)).toEqual(['b', 'c', 'a'])
    expect(ascendente).toHaveLength(3)

    const descendente = obtenerEmbarquesVisibles(lista, { ...base, ordenCampo: 'eta', ordenAsc: false })
    expect(descendente.map((e) => e.id)).toEqual(['a', 'c', 'b'])
    expect(descendente).toHaveLength(3)
  })

  it('combina búsqueda y filtro de estado manteniendo el orden y normaliza el estado', () => {
    const lista = [
      crearEmbarque({ id: 'x', cliente: 'Muñoz', estado: 'pendiente', etd: '2026-01-05', eta: '2026-02-01' }),
      crearEmbarque({ id: 'y', cliente: 'Muñoz', estado: 'entregado', etd: '2026-01-01', eta: null }),
      crearEmbarque({ id: 'z', cliente: 'García', estado: 'pendiente', etd: '2026-01-03', eta: '2026-02-03' }),
    ]

    const resultado = obtenerEmbarquesVisibles(lista, {
      ...base,
      busqueda: 'munoz',
      estado: 'pendiente',
      ordenCampo: 'etd',
      ordenAsc: true,
    })
    expect(resultado.map((e) => e.id)).toEqual(['x'])

    const conEstadoSuelto = crearEmbarque({ id: 'w', cliente: 'Muñoz', estado: 'EN_TRANSITO', etd: '2026-01-02', eta: '2026-02-02' })
    const conEtaNula = crearEmbarque({ id: 'v', cliente: 'Muñoz', estado: 'EN_TRANSITO', etd: '2026-01-01', eta: null })
    const combinado = obtenerEmbarquesVisibles([...lista, conEstadoSuelto, conEtaNula], {
      ...base,
      busqueda: 'munoz',
      estado: 'en_transito',
      ordenCampo: 'eta',
      ordenAsc: true,
    })
    expect(combinado.map((e) => e.id)).toEqual(['v', 'w'])
  })
})
