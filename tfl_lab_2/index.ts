import { concatAutomata, determAutomata, getAlphabet, intersectAutomata, iterateAutomata, makeAutomata, minimizeAtomata, printAutomata, unionAutomata } from "./automata"
import config from "./config"
import { parse } from "./parser"
import { Automata, ParsingError } from "./types"
import * as fs from 'fs'
import { clearLog, logAutomata } from "./utils"

function main() {
  clearLog()
  const regex = fs.readFileSync(config.inputPath).toString()
  const tree = parse(regex)
  if(!tree) return
  const alphabet = getAlphabet(tree)
  const regexAutomata = minimizeAtomata(determAutomata(makeAutomata(tree, alphabet)))
  fs.writeFileSync(config.outputPath, JSON.stringify(regexAutomata, null, 2))
  logAutomata(regexAutomata, 'regexAutomata')
}



try {
  main()
} catch(e) {
  if (e instanceof ParsingError) {
    console.log((e as Error).message)
  } else throw e
}