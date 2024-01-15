//любой символ ( ) ?= $
//value - for symbols, type - SYMBOL, value - 'a'
export interface Lexem{
  type: LexemType
  value: string
}

export enum LexemType{
  SYMBOL,
  OPEN_BRACKET,
  CLOSE_BRACKET,
  LINE_START,
  LINE_END,
  ITERATION,
  OR,
  LOOKAHEAD_BEGIN
}

export const LexemTypeDict = [
  'SYMBOL',
  'OPEN_BRACKET',
  'CLOSE_BRACKET',
  'LINE_START',
  'LINE_END',
  'ITERATION',
  'OR',
  'LOOKAHEAD_BEGIN'
]

export enum TreeType{
  SYMBOL,
  CONCAT,
  OR,
  ITERATION,
  LOOKAHEAD,
  EMPTY,
}

export const TreeTypeDict = [
  'SYMBOL',
  'CONCAT',
  'OR',
  'ITERATION',
  'LOOKAHEAD',
  'EMPTY',
]

//лист дерева разбора, например конкатенация, в children - что конкатенируем
//В самом низу - листы symbol
//value - доп инфа, например для lookahead, есть ли доллар в конце (конец строки), symbol - 'a', 'b'
export interface Tree{
  type: TreeType
  value: string
  children: Tree[]
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