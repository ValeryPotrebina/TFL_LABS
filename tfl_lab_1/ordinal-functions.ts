import { Composition, Operation } from "./types"
import { W_REGEX } from "./utils"

export function createOrdinalFunction(label: string): Operation {
  // (w * a_1(label) + a_2(label)) x + (w * b_1(label) + b_2(label))
  return {
    operation: '+',
    arguments: [
      {
        operation: '*',
        arguments: [
          {
            operation: '+',
            arguments: [
              {
                operation: '*',
                arguments: [
                  'w',
                  `a_1${label}`
                ]
              },
              `a_2${label}`
            ]
          },
          'x'
        ]
      },
      {
        operation: '+',
        arguments: [
          {
            operation: '*',
            arguments: [
              'w',
              `b_1${label}`
            ]
          },
          `b_2${label}`
        ]
      }]

  }
}

export function composeFunction(function1: Operation, function2: Operation): Operation {
  const result = JSON.parse(JSON.stringify(function1))
  const stack: Operation[] = []
  stack.push(result)

  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    current.arguments = current.arguments.map(e => {
      if (typeof (e) == 'object') {
        stack.push(e)
        return e
      } else {
        return e == 'x' ? function2 : e
      }
    })
  }

  return result
}

// Раскрываем 
export function unwrapComposition(composition: Composition): Operation {
  const left = createOrdinalFunction(composition.left.label)
  const right = 'label' in composition.right ? createOrdinalFunction(composition.right.label) : unwrapComposition(composition.right)
  return pretifyComposition(composeFunction(left, right))
}
//a -> b c
//b -> d f
//c -> 'w'
export function leftDistributing(composition: Operation): boolean {
  const stack: Operation[] = []
  stack.push(composition)
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    if (current.operation == '*') {
      // (* что-то (+ ...) ...)   (* () ... )
      // (* x (+ (* a b) (+ a b))) -> (* x a b)) + (* x (+ a b))
      const sumIdx = current.arguments.findIndex((e, i) => i > 0 && typeof (e) == 'object' && e.operation == '+')
      if (sumIdx > 0) {
        const beforeSum = current.arguments.slice(0, sumIdx)
        const afterSum = current.arguments.slice(sumIdx + 1)
        const operation = {
          operation: '',
          arguments: []
        } as Operation
        operation.operation = '+'
        const sum = JSON.parse(JSON.stringify(current.arguments[sumIdx])) as Operation
        operation.arguments = sum.arguments.map(e => {
          if (typeof (e) == 'object' && e.operation == '*')
            return {
              operation: '*',
              arguments: [...JSON.parse(JSON.stringify(beforeSum)) as (string | Operation)[], ...e.arguments]
            } as Operation
          return {
            operation: '*',
            arguments: [...JSON.parse(JSON.stringify(beforeSum)) as (string | Operation)[], e]
          } as Operation
        })
        if (afterSum.length) {
          current.arguments = [operation, ...JSON.parse(JSON.stringify(afterSum)) as (string | Operation)[]]
        } else {
          current.operation = operation.operation
          current.arguments = operation.arguments
        }
        return true
      }
    }
    current.arguments.forEach(e => {
      if (typeof (e) == 'object') {
        stack.push(e)
      }
    })
  }
  return false
}

export function removeOrdinals(composition: Operation) {
  const stack: Operation[] = []
  stack.push(composition)
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue

    //(+ a b w c d w) -> (+ a w c w) -> (+ w w)
    let newArgs = (JSON.parse(JSON.stringify(current)) as Operation).arguments.filter((v, i, self) =>
      !(i < self.length - 1 &&
        (typeof (v) == 'string' && !W_REGEX.test(v)) &&
        ((typeof (self[i + 1]) == 'string' && W_REGEX.test(self[i + 1] as string)) ||
          ((self[i + 1] as Operation).operation == '*' && !!(self[i + 1] as Operation).arguments.find(e => typeof (e) == 'string' && W_REGEX.test(e))))))
    while (current.arguments.length != newArgs.length) {
      current.arguments = newArgs
      newArgs = (JSON.parse(JSON.stringify(current)) as Operation).arguments.filter((v, i, self) =>
        !(i < self.length - 1 &&
          (typeof (v) == 'string' && !W_REGEX.test(v)) &&
          ((typeof (self[i + 1]) == 'string' && W_REGEX.test(self[i + 1] as string)) ||
            ((self[i + 1] as Operation).operation == '*' && !!(self[i + 1] as Operation).arguments.find(e => typeof (e) == 'string' && W_REGEX.test(e))))))
    }

    current.arguments.forEach(e => {
      if (typeof (e) == 'object') {
        stack.push(e)
      }
    })
  }
}


export function restructureComposition(composition: Operation) {
  const stack: Operation[] = []
  stack.push(composition)
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    //(+ w)    (w + a) * b -> (+ w) * b + a
    current.arguments = current.arguments.map(e =>
      typeof (e) == 'object' && e.arguments.length == 1 ? e.arguments[0] : e
    )
    //(a + (b + c)) -> (a + b + c)   [a op] -> [a [b c]]
    current.arguments = current.arguments.map(e => typeof (e) == 'object' && e.operation == current.operation ? e.arguments : e).flat(1)
    // w * w^2 -> w^3
    if(current.operation == '*'){
      for (let i = 0; i < current.arguments.length; i++) {
        if (typeof (current.arguments[i]) == 'string' && W_REGEX.test(current.arguments[i] as string)) {
          let j = i + 1
          while (j < current.arguments.length && typeof (current.arguments[j]) == 'string' && W_REGEX.test(current.arguments[j] as string)) {
            j++
          }
          if (j != i + 1) {
            const degree = current.arguments.slice(i, j).map(e => e == 'w' ? 1 : parseInt((e as string).substring(2))).reduce((p, c) => p + c, 0)
            current.arguments[i] = `w^${degree}`
            current.arguments = current.arguments.filter((v, idx) => idx <= i || idx >= j)
          }
        }
      }
    }

    current.arguments.forEach(e => {
      if (typeof (e) == 'object') {
        stack.push(e)
      }
    })
  }
}

export function rightDistributing(composition: Operation): boolean {
  const stack: Operation[] = []
  stack.push(composition)
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue

    if (current.operation == '*') {
      const sumArg = current.arguments[0]
      if (
        //  (wb + .. + a) * b -> (wb + ... ) * b + a
        (typeof (sumArg) == 'object' && sumArg.operation == '+') &&
        ((typeof (sumArg.arguments[0]) == 'string' && W_REGEX.test(sumArg.arguments[0])) ||
          ((sumArg.arguments[0] as Operation).operation == '*' && !!(sumArg.arguments[0] as Operation).arguments.find(e => typeof (e) == 'string' && W_REGEX.test(e)))) &&
        typeof (sumArg.arguments[sumArg.arguments.length - 1]) == 'string' && sumArg.arguments[sumArg.arguments.length - 1] != 'x' && !W_REGEX.test(sumArg.arguments[sumArg.arguments.length - 1] as string) &&
        current.arguments[1] != 'x'
      ) {
        // console.log(JSON.stringify(current, null, 4))
        const lastCoeff = sumArg.arguments[sumArg.arguments.length - 1]
        sumArg.arguments = sumArg.arguments.slice(0, sumArg.arguments.length - 1)
        const operation = JSON.parse(JSON.stringify(current))
        current.operation = '+'
        current.arguments = [
          operation,
          lastCoeff
        ]
        return true
      }
    }

    current.arguments.forEach(e => {
      if (typeof (e) == 'object') {
        stack.push(e)
      }
    })
  }
  return false
}


export function pretifyComposition(composition: Operation): Operation {
  let done = true
  while (leftDistributing(composition) || rightDistributing(composition)) {
    restructureComposition(composition)
    removeOrdinals(composition)
  }
  restructureComposition(composition)
  removeOrdinals(composition)




  return composition
}

//