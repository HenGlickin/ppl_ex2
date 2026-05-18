import { ClassExp, ProcExp, Exp, Program, Binding, CExp, makeIfExp, makeAppExp, makePrimOp, makeVarRef, makeLitExp, makeProcExp, makeVarDecl, isClassExp, isAtomicExp, isProgram, makeProgram, isDefineExp, makeDefineExp, isIfExp, isLitExp, isProcExp, isAppExp, makeLetExp, makeBinding, isLetExp } from "./L3-ast";
import { Result, bind, makeFailure, makeOk, mapResult, mapv } from "../shared/result";
import { makeSymbolSExp } from "./L3-value";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
2c
*/
export const class2proc = (exp: ClassExp): ProcExp =>{
    const methodsToBody = (methods: Binding[]): CExp =>{
        if(methods.length === 0)
            return makeLitExp(makeSymbolSExp("error"));
        
        const methodsProc = methods[0].val as ProcExp;

        return makeIfExp(
            makeAppExp(makePrimOp("eq?"),[
                makeVarRef("msg"), makeLitExp(makeSymbolSExp(methods[0].var.var))
            ]), methodsProc.body[0], methodsToBody(methods.slice(1))
        );
    };

    return makeProcExp(exp.fields,
        [makeProcExp([makeVarDecl("msg")], [methodsToBody(exp.methods)])]
    );
}

/*
Purpose: Transform all class forms in the given AST to procs
Signature: transform(AST)
Type: [Exp | Program] => Result<Exp | Program>
2c
*/

const transformCExp = (exp: CExp): Result<CExp> =>
    isClassExp(exp) ? makeOk(class2proc(exp)) :
    isAtomicExp(exp) || isLitExp(exp) ? makeOk(exp) :
    isIfExp(exp) ?bind(transformCExp(exp.test),
        test => bind(transformCExp(exp.then),
        then => mapv(transformCExp(exp.alt), alt => makeIfExp(test, then, alt)))) :
    isProcExp(exp) ? mapv(mapResult(transformCExp, exp.body), body => makeProcExp(exp.args, body)) :
    isLetExp(exp) ? bind(mapResult(b => mapv(transformCExp(b.val), 
        val => makeBinding(b.var.var, val)), exp.bindings),
            bindings => mapv(mapResult(transformCExp, exp.body), 
            body => makeLetExp(bindings, body))) :
    isAppExp(exp) ? bind(transformCExp(exp.rator), 
    rator => mapv(mapResult(transformCExp, exp.rands), rands => makeAppExp(rator, rands))) :
    makeFailure("Unexpected CExp in transform");

const transformExp = (exp: Exp): Result<Exp> =>
    isDefineExp(exp) ? mapv(transformCExp(exp.val), val => makeDefineExp(exp.var, val)) : transformCExp(exp);

export const transform = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? mapv(mapResult(transformExp, exp.exps), exps => makeProgram(exps)) : transformExp(exp);
    