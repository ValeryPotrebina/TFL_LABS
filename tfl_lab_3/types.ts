export interface Input{
  regex: RegExp
  alphabet: string[]
  maxLength: number
}

export interface LTable {
  S: string[] //prefix
  E: string[] //suffix
  table: boolean[][] //table - contains prefix or suffix to language? [S x E]
  extS: string[] 
  extTable: boolean[][] //[extS x E]
}

export interface MATResult {
  ok: boolean,
  result: string | Automata //контр пример либо автомат
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