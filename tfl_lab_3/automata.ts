import { Automata, ParsingError } from "./types"

export function checkWord(word: string, automata: Automata){
  let currentState = automata.init
  for(let i = 0; i < word.length; i++){
    const symbol = word[i]
    const to = automata.map[currentState][symbol]
    if(to.length == 0) return false
    if(to.length > 1) throw new ParsingError('Automata is not determinate')
    currentState = to[0]
  }
  return automata.final.includes(currentState)
}