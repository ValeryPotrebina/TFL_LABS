import { checkWord } from "./automata"
import { Automata, LTable, MATResult, ParsingError } from "./types"
import { log, logTable } from "./utils"

const isPrefix = (prefix: string, word: string) => word.indexOf(prefix) == 0

export class LTableAlgorithm {
  private P: number
  private maxLength: number
  private checkedWords: string[]

  private table: LTable
  private alphabet: string[]
  private oracul: (word: string) => boolean

  constructor(
    alphabet: string[],
    oracul: (word: string) => boolean,
    P = 100,
    maxLength = 10,
  ) {
    this.P = P,
      this.maxLength = maxLength
    this.checkedWords = []
    this.oracul = oracul
    this.alphabet = alphabet
    this.table = {
      S: [],
      E: [],
      table: [],
      extS: [],
      extTable: []
    }
    this.initTable()
  }

  private initTable() {
    this.table = {
      S: ['', ...this.alphabet],
      E: ['', ...this.alphabet],
      table: [],
      extS: [],
      extTable: []
    }
    this.table.table = this.table.S.map(s =>
      this.table.E.map(e => this.oracul(`${s}${e}`))
    )
    this.restructExtended()
  }

  private restructExtended() {
    this.table.extS = this.table.S.filter(s => !this.table.S.find(v => v != s && v.indexOf(s) == 0))
      .map(s => this.alphabet.map(a => `${s}${a}`))
      .flat(1)
    this.table.extTable = this.table.extS.map(s => this.table.E.map(e => this.oracul(`${s}${e}`)))
  }

  public compute() {
    logTable(this.table)
    while (true) {
      while (!this.isFull() || !this.isCompatable()) { }
      const res = this.MAT()
      if (res.ok) {
        // write checked words
        // console.log(this.checkedWords)
        return res.result as Automata
      }
      log(`${res.ok}, ${res.result}`)
      const word = res.result as string
      Array.from(Array(word.length + 1).keys()).map(v => word.substring(0, v)).forEach((s) => {
        if (!this.table.S.includes(s)) {
          this.table.S.push(s)
          this.table.table.push(this.table.E.map(e => this.oracul(`${s}${e}`)))
        }
      })
      logTable(this.table)
    }
  }

  private isFull() {
    const compareRows = (row1: boolean[], row2: boolean[]) => row1.map((v, i) => v == row2[i]).reduce((p, c) => p && c, true)
    for (const i in this.table.extS) {
      if (!this.table.table.map(row => compareRows(row, this.table.extTable[i])).reduce((p, c) => p || c, false)) {
        this.table.S.push(this.table.extS[i])
        this.table.table.push(this.table.extTable[i])
        this.restructExtended()
        return false
      }
    }
    return true
  }

  private isCompatable() {
    const compareRows = (row1: boolean[], row2: boolean[]) => row1.map((v, i) => v == row2[i]).reduce((p, c) => p && c, true)
    for (let i = 0; i < this.table.S.length; i++) {
      for (let j = i + 1; j < this.table.S.length; j++) {
        if (!compareRows(this.table.table[i], this.table.table[j])) continue
        for (const a of this.alphabet) {
          const ii = [...this.table.S, ...this.table.extS].indexOf(`${this.table.S[i]}${a}`)
          const jj = [...this.table.S, ...this.table.extS].indexOf(`${this.table.S[j]}${a}`)
          if (ii < 0 || jj < 0) continue
          const k = this.table.E.find((_, k) => {
            const val1 = ii < this.table.S.length ? this.table.table[ii][k] : this.table.extTable[ii - this.table.S.length][k]
            const val2 = jj < this.table.S.length ? this.table.table[jj][k] : this.table.extTable[jj - this.table.S.length][k]
            return val1 != val2
          })
          if (k) {
            const newSuffix = `${a}${k}`
            this.table.E.push(newSuffix)
            this.table.S.forEach((s, i) => {
              this.table.table[i].push(this.oracul(`${s}${newSuffix}`))
            })
            this.table.extS.forEach((s, i) => {
              this.table.extTable[i].push(this.oracul(`${s}${newSuffix}`))
            })
            return false
          }
        }
      }
    }
    return true
  }

  private buildAutomata() {
    const compareRows = (row1: boolean[], row2: boolean[]) => row1.map((v, i) => v == row2[i]).reduce((p, c) => p && c, true)
    const findWords = (row: boolean[]) => this.table.table.map((v, i) => ({
      id: i,
      row: v
    })).filter(v => compareRows(row, v.row)).map(v => this.table.S[v.id])

    const statesDict = this.table.table.filter((row, i, self) => self.findIndex(v => compareRows(row, v)) == i)
    const initState = statesDict.findIndex(row => compareRows(row, this.table.table[this.table.S.indexOf('')]))
    if (initState == -1) return undefined
    const automata: Automata = {
      states: statesDict.length,
      init: initState,
      final: this.table.table.filter((v, i) => v[this.table.E.indexOf('')])
        .map(row => statesDict.findIndex(v => compareRows(row, v)))
        .filter((v, i, self) => self.indexOf(v) == i),
      alphabet: this.alphabet,
      map: []
    }
    automata.map = statesDict.map(() => {
      const res: { [symbol: string]: number[] } = {}
      automata.alphabet.forEach(a => res[a] = [])
      return res
    })
    const addTransition = (fromRow: boolean[], toRow: boolean[], a: string) => {
      const from = statesDict.findIndex(row => compareRows(row, fromRow))
      const to = statesDict.findIndex(row => compareRows(row, toRow))
      if (!automata.map[from][a].includes(to)) {
        automata.map[from][a].push(to)
      }
    }

    this.table.S.forEach((fromS, i) => {
      [...this.table.S, ...this.table.extS].forEach((toS, j) => {
        if (toS.length == fromS.length + 1 && toS.indexOf(fromS) == 0) {
          const a = toS[toS.length - 1]
          addTransition(this.table.table[i],
            j < this.table.S.length ? this.table.table[j] : this.table.extTable[j - this.table.S.length],
            a)
        }
      })
    })
    return automata
  }


  private MAT(): MATResult {
    const automata = this.buildAutomata()
    if (!automata) throw new ParsingError("Can't build automata")
    for (let i = 0; i < this.P; i++) {
      const length = Math.floor(1 + Math.random() * this.maxLength)
      const word = Array.from(Array(length).keys()).map(() => this.alphabet[Math.floor(Math.random() * this.alphabet.length)]).join('')
      this.checkedWords.push(word)
      if (this.oracul(word) != checkWord(word, automata)) {
        return {
          ok: false,
          result: word
        }
      }
    }
    this.checkedWords = this.checkedWords.filter((v, i, self) => self.indexOf(v) == i)
    return {
      ok: true,
      result: automata
    }
  }
}

