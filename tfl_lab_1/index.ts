import { parseInput } from "./input-parse";
import { createOrdinalFunction, pretifyComposition, unwrapComposition } from "./ordinal-functions";
import { compareFunctions, createSMTRule, defineVars, restrictVars } from "./smt-creator";
import { Composition, Data, Operation, Rule, Term } from "./types";
import { writeOperation } from "./utils";
import { restrictFunctions } from "./smt-creator"
import * as fs from 'fs';
import * as childProcess from 'child_process'
import config from "./config";


const data = parseInput(config.inputPath)
createSMTFile(config.smtPath, data)
checkSat(config.z3Path, config.smtPath, config.outPath)

function createSMTFile(path: string, data: Data){
  const termsSMT = defineVars(data.terms)
  const restrictTerms = restrictVars(data.terms)
  const restrictFunc = restrictFunctions(data.terms)
  const rulesSMT = data.rules.map(rule => {
    const left = pretifyComposition('label' in rule.in ? createOrdinalFunction(rule.in.label) : unwrapComposition(rule.in))
    const right = pretifyComposition('label' in rule.out ? createOrdinalFunction(rule.out.label) : unwrapComposition(rule.out))
    return createSMTRule(left, right)
  }).join('\n\n')
  const result = `${termsSMT}\n\n${restrictTerms}\n\n${restrictFunc}\n\n${rulesSMT}\n\n(check-sat)\n\n(get-model)\n\n(exit)`
  fs.writeFileSync(path, result)
}

function checkSat(z3Path: string, smtPath: string, outPath: string ){
  const cmd = `${z3Path} ${smtPath}`
  childProcess.exec(cmd, function(err, data, err_data) {  
    if(err){
      console.log(err_data.toString())
    }
    console.log(data.toString())                     
    fs.writeFileSync(outPath, data.toString())                     
  })
}