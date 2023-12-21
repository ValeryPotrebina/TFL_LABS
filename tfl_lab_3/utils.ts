import * as fs from 'fs'
import config from './config'
import { Automata, LTable } from './types'
// import { printAutomata } from './automata'

export function clearLog(){
  fs.writeFileSync(config.logPath, '')
}

export function logAutomata(automata: Automata, label?: string){
  fs.appendFileSync(config.logPath, `AUTOMATA(${label ?? ''}): \n${printAutomata(automata)}\n\n`)
}

export function logTable(LTable: LTable, label?: string){
  fs.appendFileSync(config.logPath, `TABLE(${label ?? ''}): \n${printTable(LTable)}\n`)
}

export function log(text: string){
  fs.appendFileSync(config.logPath, `${text}\n`)
}

function addLeadingSpaces(e: string, count: number){
  const spaces = count - e.length
  return `${' '.repeat(spaces)}${e}`
}

export function printAutomata(automata: Automata) {
  const statesLine = `STATES: ${Array.from(Array(automata.states).keys()).join(' ')}`
  const initLine = `INIT: ${automata.init}`
  const finalLine = `FINAL: ${automata.final.join(' ')}`
  const alphabetLine = `ALPHABET: ${automata.alphabet.join(' ')}`
  //размер колонок
  const columnSizes = automata.map.map(e => Math.max(...automata.alphabet.map(symbol => e[symbol] != undefined ? Math.max(e[symbol].length, 1) : 1))).map(e => (e - 1) * 2 + 1)
  //заголовок (алфавит)
  const header = `TABLE: \n${addLeadingSpaces('\\', (automata.states - 1).toString().length)} | ${automata.alphabet.map((e, i) => addLeadingSpaces(e, columnSizes[i])).join(' | ')}`
  //строки таблицы
  const table = automata.map.map((e, j) => {
    const tableLeft = addLeadingSpaces(j.toString(), (automata.states - 1).toString().length)
    const tableLine = automata.alphabet.map((symbol, i) => addLeadingSpaces(e[symbol] ? e[symbol].join(',') : '', columnSizes[i])).join(' | ')
    return `${tableLeft} | ${tableLine}`
  })
  return `${statesLine}\n${initLine}\n${finalLine}\n${alphabetLine}\n${header}\n${'-'.repeat(header.length)}\n${table.join('\n')}`
}

export function printTable(table: LTable) {
  const firstColumnLength = Math.max(...([...table.S, ...table.extS]).map(e => e ? e.length : 1))
  const columnLengths = table.E.map(e => (e ? e : 'e').length)
  const header = `${addLeadingSpaces(' ', firstColumnLength)} ${table.E.map(e => e ? e : 'e').join(' ')}`
  const body = table.S.map((s, i) => `${addLeadingSpaces(s ? s : 'e', firstColumnLength)} ${table.table[i].map((v, i) => addLeadingSpaces(v ? '1' : '0', columnLengths[i])).join(' ')}`)
  const extBody = table.extS.map((s, i) => `${addLeadingSpaces(s ? s : 'e', firstColumnLength)} ${table.extTable[i].map((v, i) => addLeadingSpaces(v ? '1' : '0', columnLengths[i])).join(' ')}`)
  return `${header}\n${body.join('\n')}\n${'-'.repeat(firstColumnLength + 1 + columnLengths.reduce((p, c) => p + c, 0) + columnLengths.length - 1)}\n${extBody.join('\n')}`
}