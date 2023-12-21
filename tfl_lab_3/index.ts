import config from "./config";
import * as fs from 'fs'
import { LTableAlgorithm } from "./l-table";
import { readInput } from "./parser";
import { Automata, ParsingError } from "./types";
import { clearLog, logAutomata, printAutomata } from "./utils";

function main(){
  // clearLog()
  // readInput()
  const input = readInput()
  const oracul = (word: string) => input.regex.test(word)
  const l = new LTableAlgorithm(input.alphabet, oracul, config.P, input.maxLength)
  const automata = l.compute()
  logAutomata(automata)
  printResults(automata)
}

function printResults(automata: Automata){
  fs.writeFileSync(config.outputPath, printAutomata(automata))
}

try{
  clearLog()
  main()
}catch(e){
  if(e instanceof ParsingError){
    console.log((e as Error).message)
  }else throw e
}