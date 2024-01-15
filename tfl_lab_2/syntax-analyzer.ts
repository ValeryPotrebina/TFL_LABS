import { Lexem, LexemType, LexemTypeDict, ParsingError, Tree, TreeType } from "./types"


export class SyntaxAnalyzer{
  lexems: Lexem[]
  position: number
  length: number
  
  constructor(lexems: Lexem[]){
    this.lexems = lexems
    this.position = 0
    this.length = lexems.length
  }

  private current(){
    return this.position < this.length ? this.lexems[this.position] : undefined
  } 

  private next(){
    this.position++
  }

  private lexemToString(lexem: Lexem | undefined){
    if(!lexem) return 'END'
    return LexemTypeDict[lexem.type]
  }
  
  public parse(){
    console.time('parse')
    const tree: Tree = this.parseInit()
    console.timeEnd('parse')
    while(this.simplify(tree)){}
    while(this.lookaheadConcatCreate(tree)){}
    return tree
  }

  // упрощение просто
  private simplify(tree: Tree){
    const stack: Tree[] = [tree]
    while(stack.length){
      const current = stack.pop()!
      //(or a b (or ...) c) -> (or a b ... c)
      if((current.type == TreeType.CONCAT || current.type == TreeType.OR)){
        const sameTypeIdx = current.children.findIndex(e => e.type == current.type) 
        if(sameTypeIdx >= 0){
          const toAppend = current.children[sameTypeIdx].children
          current.children = [...current.children.slice(0, sameTypeIdx), ...toAppend, ...current.children.slice(sameTypeIdx+1)]
          return true
        }
      }
      current?.children.forEach(e => {
        if(e.children.length != 0) stack.push(e)
      })
    }
    return false
  }

  //()|(?=)
  //оборачивает лукахеды конкатенацией, чтобы они всегда были дочерними у конкатенации (не OR например)
  private lookaheadConcatCreate(tree: Tree){
    const stack: Tree[] = [tree]
    while(stack.length){
      const current = stack.pop()!
      if(current.type != TreeType.CONCAT){
        const lookahead = current.children.find(e => e.type == TreeType.LOOKAHEAD)
        if(lookahead){
          const lookaheadCopy = JSON.parse(JSON.stringify(lookahead)) as Tree
          lookahead.type = TreeType.CONCAT
          lookahead.children = [lookaheadCopy]
          return true
        }
      }
      current?.children.forEach(e => {
        if(e.children.length != 0) stack.push(e)
      })
    }
    return false
  }

  private parseInit(): Tree{
    if(this.current()?.type != LexemType.LINE_START) throw new ParsingError(`SYNTAX ERROR: EXPECTED "^" BUT FOUND "${this.lexemToString(this.current())}"`)
    this.next()
    const first = this.parseRegex()
    // см на грамматику внизу 
    if(this.current()?.type != LexemType.LINE_END) throw new ParsingError(`SYNTAX ERROR: EXPECTED "$" BUT FOUND "${this.lexemToString(this.current())}"`)
    return first
  }

  private parseRegex(): Tree{
    const first = this.parseConcat()
    if(this.current()?.type == LexemType.OR){
      this.next()
      const next = this.parseRegex()
      return {
        type: TreeType.OR,
        value: '',
        children: [first, next]
      }
    }
    return first
  }

  private parseConcat(): Tree{
    const first = this.parseIter()
    if(this.current()?.type == LexemType.OPEN_BRACKET || this.current()?.type == LexemType.SYMBOL){
      const next = this.parseConcat()
      return {
        type: TreeType.CONCAT,
        value: '',
        children: [first, next]
      }
    }
    return first
  }

  private parseIter(): Tree{
    const first = this.parseGroup()
    if(this.current()?.type == LexemType.ITERATION){
      this.next()
      return {
        type: TreeType.ITERATION,
        value: '',
        children: [first]
      }
    }
    return first
  }

  private parseGroup(): Tree{
    if(this.current()?.type == LexemType.SYMBOL){
      const symbol = this.current()!.value
      this.next()
      return {
        type: TreeType.SYMBOL,
        value: symbol,
        children: []
      }
    }
    if(this.current()?.type == LexemType.OPEN_BRACKET){
      this.next()
      if(!this.current()) throw new ParsingError('UNEXCPECTED END')
      if(this.current()!.type == LexemType.LOOKAHEAD_BEGIN){
        this.next()
        const lookahead = this.parseLookahead()
        if(this.current()?.type != LexemType.CLOSE_BRACKET) throw new ParsingError('UNEXCPECTED END')
        this.next()
        return lookahead
      }
      const regex = this.parseRegex()
      if(this.current()?.type != LexemType.CLOSE_BRACKET) throw new ParsingError('UNEXCPECTED END')
      this.next()
      return regex
    }
    throw new ParsingError(`SYNTAX ERROR: EXPECTED "(" OR SYMBOL BUT FOUND "${this.lexemToString(this.current())}"`)
  }

  private parseLookahead(): Tree{
    const first = this.parseRegex()
    const ending = this.current()?.type == LexemType.LINE_END
    if(ending) this.next()
    return {
      type: TreeType.LOOKAHEAD,
      value: ending ? '$' : '',
      children: [first]
    }
  }
}


// init :== ^regex$ | ^$
// regex :== concat|regex | concat
// concat :== iter concat | iter
// iter :== group* | group
// group :== (regex) | symbol | (?=lookahead)
// lookahead :== regex | regex$
