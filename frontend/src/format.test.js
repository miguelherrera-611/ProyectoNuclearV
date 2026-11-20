import { describe, expect, it } from 'vitest'
import {
  formatearFechaLarga,
  formatearNumero,
  formatearPeriodo,
  formatearPorcentaje,
  formatearUnidades,
} from './format'

describe('formatearNumero', () => {
  it('usa separador de miles con punto y decimales con coma (es-CO)', () => {
    expect(formatearNumero(1248.4)).toBe('1.248,40')
  })

  it('respeta la cantidad de decimales pedida', () => {
    expect(formatearNumero(8.4567, 1)).toBe('8,5')
  })

  it('devuelve "/" cuando el valor es null o undefined', () => {
    expect(formatearNumero(null)).toBe('/')
    expect(formatearNumero(undefined)).toBe('/')
  })
})

describe('formatearUnidades', () => {
  it('agrega la unidad "u" al número formateado', () => {
    expect(formatearUnidades(1248)).toBe('1.248 u')
  })

  it('devuelve "/" cuando el valor es null', () => {
    expect(formatearUnidades(null)).toBe('/')
  })
})

describe('formatearPorcentaje', () => {
  it('agrega el símbolo "%" al número formateado', () => {
    expect(formatearPorcentaje(8.4)).toBe('8,40 %')
  })

  it('devuelve "/" cuando el valor es undefined', () => {
    expect(formatearPorcentaje(undefined)).toBe('/')
  })
})

describe('formatearPeriodo', () => {
  it('acepta una fecha simple "AAAA-MM-DD"', () => {
    expect(formatearPeriodo('2026-11-01')).toMatch(/Nov.*2026/)
  })

  it('acepta una fecha con hora ISO completa sin romperse', () => {
    expect(formatearPeriodo('2026-11-01T00:00:00.000000Z')).toMatch(/Nov.*2026/)
  })

  it('pone en mayúscula solo la primera letra del mes, no el resto ("De")', () => {
    const resultadoCrudo = new Date('2026-01-01T00:00:00').toLocaleDateString('es-CO', {
      month: 'short',
      year: 'numeric',
    })
    const esperado = resultadoCrudo.charAt(0).toUpperCase() + resultadoCrudo.slice(1)
    expect(formatearPeriodo('2026-01-01')).toBe(esperado)
    expect(formatearPeriodo('2026-01-01')).not.toBe(esperado.toUpperCase())
  })
})

describe('formatearFechaLarga', () => {
  it('formatea un objeto Date con día, mes corto y año', () => {
    const resultado = formatearFechaLarga(new Date(2026, 10, 1))
    expect(resultado).toMatch(/1/)
    expect(resultado).toMatch(/2026/)
  })
})
