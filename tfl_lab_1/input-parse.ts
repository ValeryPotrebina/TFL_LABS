import { Composition, Data, Rule, Term } from "./types"
import * as fs from 'fs';




// parseInput - парсинг входных данныхв структуру Data
export function parseInput(path: string): Data {
  const data: Data = {
    terms: [],
    rules: []
  }
  const rawData = fs.readFileSync(path).toString()
  rawData.split('\n').forEach(line => {
    const sides = line.split('->')
    if (sides.length != 2) throw new Error('Wrong input')
    //Левая и правая часть правила переписывания 
    const left = sides[0].trim()
    const right = sides[1].trim()
    if (!left.length || !right.length) throw new Error('Wrong input')

    data.rules.push({
      in: parseComposition(left, data.terms),
      out: parseComposition(right, data.terms)
    } as Rule)
  })
  return data
{
  // terms: [Term(f), Term(j), Term(h), Term(g)]
  // rules: [
  //   {
  //     in: Composition(Term(f), Composition(Term(h), Term(j))) 
  //     out: Composition(Term(g), Term(f))
  //   }
  // ]
}
}

export function parseComposition(raw: string, terms: Term[]): Term | Composition {
  if (raw.length == 1) {
    const currentTermRaw = raw
    return parseTerm(currentTermRaw, terms)
  }
  let composition = {
    left: parseTerm(raw[raw.length - 2], terms),
    right: parseTerm(raw[raw.length - 1], terms)
  } as Composition
  for (let i = raw.length - 3; i >= 0; i--) {
    const currentTerm = parseTerm(raw[i], terms)
    composition = {
      left: currentTerm,
      right: composition
    }
  }
  return composition
}

export function parseTerm(rawTerm: string, terms: Term[]): Term {
  let currentTerm = terms.find(t => t.label == rawTerm)
  if (!currentTerm) {
    currentTerm = {
      label: rawTerm
    } as Term
    terms.push(currentTerm)
  }
  return currentTerm
}