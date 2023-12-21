export interface Input{
  regex: RegExp
  alphabet: string[]
  maxLength: number
}

export interface LTable {
  S: string[]
  E: string[]
  table: boolean[][]
  extS: string[]
  extTable: boolean[][]
}

export interface MATResult {
  ok: boolean,
  result: string | Automata
}

export interface Automata{
  states: number,
  final: number[],
  init: number
  alphabet: string[]
  map: ({[term: string]: number[]})[]
}

export class ParsingError extends Error{
  constructor(msg: string){
    super(msg)
    Object.setPrototypeOf(this, ParsingError.prototype)
  }
}