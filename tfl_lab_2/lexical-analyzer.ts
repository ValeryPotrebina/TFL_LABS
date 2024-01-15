import { Lexem, LexemType, ParsingError } from "./types"

const SYMBOL_REGEX = /^[a-zA-Z0-9]$/

export class LexicalAnalyzer{
  public data: string
  public position: number
  public length: number

  constructor(data: string){
    this.data = data
    this.position = 0
    this.length = data.length
  }

  private current(){
    return this.position < this.length ? this.data[this.position] : undefined
  } 

  private look(){
    return this.position < this.length - 1 ? this.data[this.position + 1] : undefined
  }

  private next(){
    this.position++
  }

  public lexicalAnalyze(): Lexem[]{
    const result: Lexem[] = []
    for(;this.current(); this.next()){
      const current = this.current() as string
      if(SYMBOL_REGEX.test(current)){
        result.push({
          type: LexemType.SYMBOL,
          value: current
        })
        continue
      }
      if(current == '?' && this.look() == '='){
        result.push({type: LexemType.LOOKAHEAD_BEGIN, value: ''})
        this.next()
        continue
      }
      switch(current){
        case '(': result.push({type: LexemType.OPEN_BRACKET, value: ''}); break;
        case ')': result.push({type: LexemType.CLOSE_BRACKET, value: ''}); break;
        case '*': result.push({type: LexemType.ITERATION, value: ''}); break;
        case '|': result.push({type: LexemType.OR, value: ''}); break;
        case '^': result.push({type: LexemType.LINE_START, value: ''}); break;
        case '$': result.push({type: LexemType.LINE_END, value: ''}); break;
        default: throw new ParsingError(`UNKNOWN SYMBOL: "${current}"!${current == '?' ? ' Did you mean "?="?': ''}`)
      }
    }
    return result
  }
}