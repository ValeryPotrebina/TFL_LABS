import * as fs from 'fs'
import config from './config'
import { Input, ParsingError } from './types'

const REGEX_HEADER     = 'regex'
const ALPHABET_HEADER  = 'alphabet'
const MAXLENGTH_HEADER = 'maxlength'

export function readInput(): Input{
  const rawData = fs.readFileSync(config.inputPath)
  const data = rawData.toString()
  
  let currentStage = ''
  let regexRaw: string | undefined
  let maxLength: number | undefined
  let alphabet: string[] = []

  data.split('\n').map(line => line.trim()).forEach(line => {
    if(line.toLowerCase() == REGEX_HEADER || 
      line.toLowerCase() == ALPHABET_HEADER ||
      line.toLowerCase() == MAXLENGTH_HEADER){
      currentStage = line.toLowerCase()
      return
    }
    switch(currentStage){
      case REGEX_HEADER: regexRaw = line; break;
      case ALPHABET_HEADER: alphabet.push(...line.split(' ')); break;
      case MAXLENGTH_HEADER: maxLength = parseInt(line)
      default: return
    }
  })

  if(!regexRaw){
    throw new ParsingError("You must specify regex")
  }
  const regex = new RegExp(regexRaw)
  if(alphabet.find(v => v.length != 1)){
    throw new ParsingError("Alphabet must contain letters")
  }
  if(!maxLength || isNaN(maxLength)){
    console.log(`maxLength is not defined and be default (10)`)
    maxLength = 10
  }

  return{
    alphabet: alphabet,
    regex: regex,
    maxLength: maxLength
  }
}