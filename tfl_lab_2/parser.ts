import config from "./config"
import { LexicalAnalyzer } from "./lexical-analyzer"
import { SyntaxAnalyzer } from "./syntax-analyzer"
import { LexemTypeDict, Tree, TreeTypeDict } from "./types"
import * as fs from 'fs'
import { logLexems, logTree } from "./utils"

export function parse(data: string): Tree | undefined{
  try{
    //сначала разбиваем на лексемы, чтобы удобнее парсить
    const lexems = new LexicalAnalyzer(data).lexicalAnalyze()
    //затем уже строим дерево
    const tree = new SyntaxAnalyzer(lexems).parse()
    logLexems(lexems)
    logTree(tree)
    return tree
  }catch(e){
    console.log((e as Error).message)
    return undefined
  }
}