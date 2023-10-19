import { Automata, ParsingError, Tree, TreeType } from "./types"
import { logAutomata } from "./utils"

function findIndexFix<T>(array: T[], predicate: (value: T) => boolean) {
  return ((v: number) => v < 0 ? array.length : v)(array.findIndex(predicate))
}

function addLeadingSpaces(e: string, count: number) {
  const spaces = count - e.length
  const rightGap = Math.floor(spaces / 2)
  return `${' '.repeat(spaces - rightGap)}${e}${' '.repeat(rightGap)}`
}

export function printAutomata(automata: Automata) {
  const statesLine = `STATES: ${Array.from(Array(automata.states).keys()).join(' ')}`
  const initLine = `INIT: ${automata.init}`
  const finalLine = `FINAL: ${automata.final.join(' ')}`
  const alphabetLine = `ALPHABET: ${automata.alphabet.join(' ')}`
  //размер колонок
  const columnSizes = automata.alphabet.map(symbol => Math.max(...automata.map.map(e => e[symbol] != undefined ? e[symbol].join(',').length : 1)) + 1)
  //заголовок (алфавит)
  const header = `TABLE: \n${addLeadingSpaces('\\', (automata.states - 1).toString().length)} | ${automata.alphabet.map((e, i) => addLeadingSpaces(e, columnSizes[i])).join(' | ')}`
  //строки таблицы
  const table = automata.map.map((e, j) => {
    const tableLeft = addLeadingSpaces(j.toString(), (automata.states - 1).toString().length)
    const tableLine = automata.alphabet.map((symbol, i) => addLeadingSpaces(e[symbol] ? e[symbol].join(',') : '', columnSizes[i])).join(' | ')
    return `${tableLeft} | ${tableLine}`
  })
  return `${statesLine}\n${initLine}\n${finalLine}\n${alphabetLine}\n${header}\n${'-'.repeat(header.length)}\n${table.join('\n')}`

}

export function makeAutomata(tree: Tree, alphabet: string[]): Automata {
  if (tree.type == TreeType.SYMBOL) {
    const res: Automata = {
      states: 2,
      init: 0,
      final: [1],
      alphabet: [tree.value],
      map: [{}, {}]
    }
    res.map[0][tree.value] = [1]
    logAutomata(res, `Symbol(${tree.value})`)
    return res
  }
  if (tree.type == TreeType.ITERATION) {
    const iter = iterateAutomata(makeAutomata(tree.children[0], alphabet))
    logAutomata(iter, `ITER`)
    return iter
  }
  if (tree.type == TreeType.OR) {
    let aut = unionAutomata(makeAutomata(tree.children[0], alphabet), makeAutomata(tree.children[1], alphabet))
    for (let i = 2; i < tree.children.length; i++) {
      aut = unionAutomata(aut, makeAutomata(tree.children[i], alphabet))
    }

    logAutomata(aut, `OR`)
    return aut
  }
  if (tree.type == TreeType.CONCAT) {
    if (!tree.children.length) return {
      states: 1,
      init: 0,
      final: [0],
      alphabet: [],
      map: [{}]
    }
    const lookaheadStartIdx = findIndexFix(tree.children, e => e.type == TreeType.LOOKAHEAD)
    if (lookaheadStartIdx == tree.children.length) {
      let automata = makeAutomata(tree.children[0], alphabet)
      for (let i = 1; i < tree.children.length; i++) {
        automata = concatAutomata(automata, makeAutomata(tree.children[i], alphabet))
      }
      logAutomata(automata, `CONCAT`)
      return automata
    }
    const lookaheadEndIdx = lookaheadStartIdx + findIndexFix(tree.children.slice(lookaheadStartIdx), e => e.type != TreeType.LOOKAHEAD)
    const beforeSlice = [...tree.children.slice(0, lookaheadStartIdx)]
    const afterSlice = [...tree.children.slice(lookaheadEndIdx)]
    const beforeAutomata = makeAutomata({
      type: TreeType.CONCAT,
      value: '',
      children: beforeSlice
    }, alphabet)

    logAutomata(beforeAutomata, `BEFORE`)
    const afterAutomata = makeAutomata({
      type: TreeType.CONCAT,
      value: '',
      children: afterSlice
    }, alphabet)
    logAutomata(afterAutomata, `AFTER`)
    let lookaheadAutomata = makeAutomata(tree.children[lookaheadStartIdx], alphabet)
    for (let i = lookaheadStartIdx + 1; i < lookaheadEndIdx; i++) {
      lookaheadAutomata = intersectAutomata(lookaheadAutomata, makeAutomata(tree.children[i], alphabet))
    }
    logAutomata(lookaheadAutomata, `LOOKAHEAD_INTER`)
    // if(!lookaheadAutomata.final.length) throw new ParsingError("LOOKAHEAD CONCAT DOESNT EXIST!")
    const intersection = intersectAutomata(lookaheadAutomata, afterAutomata)
    logAutomata(intersection, `INTERSECT`)
    // if(!intersection.final.length) throw new ParsingError("LOOKAHEAD OVERLAP DOESNT EXIST!")
    const concat = concatAutomata(beforeAutomata, intersection)

    logAutomata(concat, `LOOKAHEAD_CONCAT`)
    return concat
  }
  if (tree.type == TreeType.LOOKAHEAD) {
    const automata = makeAutomata(tree.children[0], alphabet)

    logAutomata(tree.value == '$' ? automata : addEndIteration(automata, alphabet), `LOOKAHEAD`)
    return tree.value == '$' ? automata : addEndIteration(automata, alphabet)
  }
  throw new ParsingError("UNABLE TO CREATE AUTOMATA!")
}

export function concatAutomata(aut1: Automata, aut2: Automata): Automata {
  const aut2StateConverter = (v: number) => v == aut2.init ? aut1.final : [aut1.states + (v < aut2.init ? v : v - 1)]
  const res_aut: Automata = {
    states: aut1.states + aut2.states - 1,
    init: aut1.init,
    final: aut2.final.map(aut2StateConverter).flat(1),
    alphabet: [...aut1.alphabet, ...aut2.alphabet].filter((v, i, self) => self.indexOf(v) == i),
    map: Array.from(Array(aut1.states + aut2.states - 1,)).map(() => ({}))
  }
  aut1.map.forEach((e, i) => {
    for (let symbol in e) {
      if (!e[symbol]) return
      if (res_aut.map[i][symbol]) {
        res_aut.map[i][symbol].push(...e[symbol].filter(v => !res_aut.map[i][symbol].includes(v)))
      } else {
        res_aut.map[i][symbol] = [...e[symbol]]
      }
    }
  })
  aut2.map.forEach((e, i) => {
    const targetLine = aut2StateConverter(i)
    //откуда но в новых кордах
    for (let symbol in e) {
      if (!e[symbol]) return
      //куда но в новых кордах
      const targetStates = e[symbol].map(aut2StateConverter).flat(1).filter((v, i, self) => self.indexOf(v) == i)
      //если уже существует массив дописываем новые и наче просто устанавливаем
      targetLine.forEach(targetLineState => {
        if (res_aut.map[targetLineState][symbol]) {
          res_aut.map[targetLineState][symbol].push(...targetStates.filter(v => !res_aut.map[targetLineState][symbol].includes(v)))
        } else {
          res_aut.map[targetLineState][symbol] = [...targetStates]
        }
      })
    }
  })
  return res_aut
}

export function unionAutomata(aut1: Automata, aut2: Automata): Automata {
  //если init то берем из первого, иначе дописываем номера состояний по порядку после состояний первого
  const aut2StateConverter = (v: number) => v == aut2.init ? aut1.init : v > aut2.init ? v + aut1.states - 1 : v + aut1.states
  const res_aut: Automata = {
    //сумма, но init общий
    states: aut1.states + aut2.states - 1,
    init: aut1.init,
    //объединение финальных без init
    final: [...aut1.final.filter(e => e != aut1.init), ...aut2.final.filter(e => e != aut2.init).map(aut2StateConverter)],
    //уникальное объединение
    alphabet: [...aut1.alphabet, ...aut2.alphabet].filter((v, i, self) => self.indexOf(v) == i),
    map: Array.from(Array(aut1.states + aut2.states - 1,)).map(() => ({}))
  }
  //добавляем init в финальные (если хоть где-то он таков)
  if (aut1.final.includes(aut1.init) || aut2.final.includes(aut2.init)) res_aut.final.push(aut1.init)
  //заполняем первый автомат
  aut1.map.forEach((e, i) => {
    for (let symbol in e) {
      if (!e[symbol]?.length) return
      //если уже существует массив дописываем новые и наче просто устанавливаем
      if (res_aut.map[i][symbol]) {
        res_aut.map[i][symbol].push(...e[symbol].filter(v => !res_aut.map[i][symbol].includes(v)))
      } else {
        res_aut.map[i][symbol] = [...e[symbol]]
      }
    }
  })
  //заполняем второй автомат
  aut2.map.forEach((e, i) => {
    //откуда но в новых кордах
    const targetLine = aut2StateConverter(i)
    for (let symbol in e) {
      if (!e[symbol]?.length) return
      //куда но в новых кордах
      const targetStates = e[symbol].map(aut2StateConverter)
      //если уже существует массив дописываем новые и наче просто устанавливаем
      if (res_aut.map[targetLine][symbol]) {
        res_aut.map[targetLine][symbol].push(...targetStates.filter(v => !res_aut.map[targetLine][symbol].includes(v)))
      } else {
        res_aut.map[targetLine][symbol] = [...targetStates]
      }
    }
  })
  return res_aut
}

export function intersectAutomata(aut1: Automata, aut2: Automata): Automata {
  const res_aut: Automata = {
    states: 1,
    init: 0,
    alphabet: aut1.alphabet.filter(e => aut2.alphabet.includes(e)),
    final: [],
    map: [{}]
  }
  const dict: { [pair: string]: number } = {}
  dict[[aut1.init, aut2.init].join(',')] = 0

  const stack: number[][] = [[aut1.init, aut2.init]]
  while (stack.length) {
    const current = stack.shift()!
    res_aut.alphabet.forEach(symbol => {
      const aut1Moves = aut1.map[current[0]][symbol]
      const aut2Moves = aut2.map[current[1]][symbol]
      if (!aut1Moves?.length! || !aut2Moves?.length) return
      const pairs = aut1Moves.map(e1 => aut2Moves.map(e2 => [e1, e2])).flat(1)
      pairs.forEach(pair => {
        const newState = pair.join(',')
        if (dict[newState] == undefined) {
          //добавляем его в словарь и назначаем ему слудующий номер
          dict[newState] = res_aut.states
          res_aut.map.push({})
          res_aut.states++
          //а также добавляем в очередь обработки
          stack.push(pair)
        }
        if (!res_aut.map[dict[current.join(',')]][symbol]) {
          res_aut.map[dict[current.join(',')]][symbol] = []
        }
        if (!res_aut.map[dict[current.join(',')]][symbol].includes(dict[newState])) {
          res_aut.map[dict[current.join(',')]][symbol].push(dict[newState])
        }
      })
    })
  }

  for (let key in dict) {
    const pair = key.split(',').map(e => parseInt(e))
    if (aut1.final.includes(pair[0]) && aut2.final.includes(pair[1])) {
      res_aut.final.push(dict[key])
    }
  }

  return res_aut
}

export function iterateAutomata(aut: Automata): Automata {
  const res_aut = JSON.parse(JSON.stringify(aut)) as Automata
  const initMoves = res_aut.map[res_aut.init]
  res_aut.final.forEach(e => {
    res_aut.alphabet.forEach(symbol => {
      if (!initMoves[symbol]) return
      if (res_aut.map[e][symbol]) {
        res_aut.map[e][symbol].push(...initMoves[symbol].filter(v => !res_aut.map[e][symbol].includes(v)))
      } else {
        res_aut.map[e][symbol] = [...initMoves[symbol]]
      }
    })
  })
  if (!res_aut.final.includes(res_aut.init)) {
    res_aut.final.push(res_aut.init)
  }
  return res_aut
}

export function determAutomata(aut: Automata): Automata {
  //По умолчанию 1 состояние (начальное), алфавит тот же
  const res_aut: Automata = {
    states: 1,
    init: 0,
    final: [],
    alphabet: aut.alphabet,
    map: [{}]
  }
  //словарб состояний (в новом автомате состояния - подмножества (0) - init, (1,2,3) и т.д.)
  const dict: { [state: string]: number } = {}
  dict[aut.init.toString()] = 0

  //состояния на обработку
  const stack: number[][] = [[aut.init]]
  while (stack.length) {
    const current = stack.shift()!
    //для каждого символа алфавита
    aut.alphabet.forEach(symbol => {
      //смотрим куда переходят состояния из подмножества
      const statesSet = current.map(e => aut.map[e][symbol]).filter(e => e != undefined).flat(1).filter((v, i, self) => self.indexOf(v) == i)
      if (!statesSet.length) return
      //новое состояние в формате строки (1,2,3)
      const newState = statesSet.join(',')
      //если такого еще не встречали
      if (dict[newState] == undefined) {
        //добавляем его в словарь и назначаем ему слудующий номер
        dict[newState] = res_aut.states
        res_aut.map.push({})
        res_aut.states++
        //а также добавляем в очередь обработки
        stack.push(statesSet)
      }
      //формируем переход для символа
      res_aut.map[dict[current.join(',')]][symbol] = [dict[newState]]
    })
  }
  //формируем финальные состояния - все состояния-подмножества, которые содержат хотя бы одно финальное состояние из исходного
  for (let key in dict) {
    if (key.split(',').map(e => parseInt(e)).filter(e => aut.final.includes(e)).length) {
      res_aut.final.push(dict[key])
    }
  }
  return res_aut
}

export function addEndIteration(aut: Automata, alphabet: string[]): Automata {
  const res_aut = JSON.parse(JSON.stringify(aut)) as Automata
  res_aut.alphabet = [...alphabet]
  res_aut.final.forEach(state => {
    res_aut.alphabet.forEach(symbol => {
      if (!res_aut.map[state][symbol]) {
        res_aut.map[state][symbol] = []
      }
      if (!res_aut.map[state][symbol].includes(state)) {
        res_aut.map[state][symbol].push(state)
      }
    })
  })
  return res_aut
}

export function getAlphabet(tree: Tree): string[] {
  const stack: Tree[] = [tree]
  const alphabet: string[] = []
  while (stack.length) {
    const current = stack.shift()!
    if (current.type == TreeType.SYMBOL && !alphabet.includes(current.value)) {
      alphabet.push(current.value)
    }
    stack.push(...current.children)
  }
  return alphabet
}

interface StateClass {
  state: number,
  class: number
}

export function minimizeAtomata(aut: Automata): Automata {
  aut.alphabet.forEach(symbol => {
    if (aut.map.find(e => e[symbol] && [symbol]?.length > 1)) throw new ParsingError("CANT MINIMIZE NON-DETERM AUTOMATA")
  })
  const classes: StateClass[] = []
  let classesCount = 0
  const notFinal = Array.from(Array(aut.states).keys()).filter(e => !aut.final.includes(e))
  if (notFinal.length) {
    classes.push(...notFinal.map(e => ({ state: e, class: classesCount })))
    classesCount++
  }
  if (aut.final.length) {
    classes.push(...aut.final.map(e => ({ state: e, class: classesCount })))
    classesCount++
  }
  classes.sort((a, b) => a.state - b.state)

  for (let reconstruct = true; reconstruct;) {
    reconstruct = false
    for (let i = 0; i < classesCount; i++) {
      if (reconstruct) break
      for (let symbolIdx = 0; symbolIdx < aut.alphabet.length; symbolIdx++) {
        if (reconstruct) break
        const symbol = aut.alphabet[symbolIdx]
        const classStates = classes.filter(v => v.class == i)
        const splitDict: { [key: number]: number[] } = {}
        classStates.forEach(e => {
          const toClass = aut.map[e.state][symbol]?.length ? classes[aut.map[e.state][symbol][0]].class : -1
          if (!splitDict[toClass]) splitDict[toClass] = []
          splitDict[toClass].push(e.state)
        })
        const split: number[][] = []
        for (let key in splitDict) split.push(splitDict[key])
        if (split.length != 1) {
          classesCount += split.length - 1
          classes.forEach(e => {
            if (e.class > i) e.class += split.length - 1
          })
          split.forEach((v, j) => {
            v.forEach(e => classes[e].class = i + j)
          })
          reconstruct = true
          break
        }
      }
    }
  }

  const res_aut: Automata = {
    states: classesCount,
    init: classes[aut.init].class,
    final: aut.final.map(e => classes[e].class).filter((v, i, self) => self.indexOf(v) == i),
    alphabet: aut.alphabet,
    map: Array.from(Array(classesCount).keys()).map(i => {
      const transMap: { [symbol: string]: number[] } = {}
      const stateMap = aut.map[classes.find(e => e.class == i)!.state]
      for (let symbol in stateMap) {
        transMap[symbol] = [classes[stateMap[symbol][0]].class]
      }
      return transMap
    })
  }

  return res_aut
}