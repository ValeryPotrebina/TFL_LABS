//  Компилятор не указывает ни одной строки, где реально есть ошибки
// но указывает, как на ошибочные хотя бы на 2 строки, где на самом деле ошибок нет (6 баллов)



interface A{
  a: string[]
  }

  interface B {
    a: A[]
  }

  interface C extends B{
    b: string
  }
  
  function test(c: C): number{
    const f1 = (b: B) => b.a[0]
    const f2 = f1                    //missed ;
    (c as B).a.map(e => e.a)

    return f2(c as B).a.length

  }
 