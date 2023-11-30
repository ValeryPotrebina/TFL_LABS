//  Компилятор не указывает ни одной строки, где реально есть ошибки
// но указывает, как на ошибочные хотя бы на 2 строки, где на самом деле ошибок нет (6 баллов)
  interface A{
    a: string
  }
  interface B extends A {
    b: string
  }
  const b: B = {
    a: 'a',
    b: 'b'
  }
  
  const f1 = (): number => 2
  const f2 = f1  //ERROR (need - ";")
  (b as A).a // compiler indicated an error here, although it is not here



