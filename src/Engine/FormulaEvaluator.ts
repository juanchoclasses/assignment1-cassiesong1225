import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";
type Operator = '+' | '-' | '*' | '/';



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;

  /**
   * Initializes a new instance of the FormulaEvaluator class.
   * @param memory - The sheet memory to work with.
   */

  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

  /**
   * Evaluates the provided formula.
   * On successful evaluation, the result can be retrieved using the `result` getter.
   * On failure, an error message can be retrieved using the `error` getter.
   * @param formula - The formula to evaluate.
   */

  evaluate(formula: FormulaType) {
    // Define operators and their corresponding operations.
    const operators: Record<Operator, (a: number, b: number) => number> = {
      '+': (a, b) => a + b,// Add two numbers.
      '-': (a, b) => a - b,// Subtract two numbers.
      '*': (a, b) => a * b,// Multiply two numbers.
      '/': (a, b) => {     // Divide two numbers.
        if (b === 0) {    // If divisor is 0, handle divide by zero error.
          this._errorMessage = ErrorMessages.divideByZero;
          this._result = Infinity;
          return Infinity;
        }
        return a / b;
      }
    };

    // precedence of operators
    // higher number means higher precedence
    const precedence: { [key: string]: number } = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
    };

    const values: number[] = [];// Stack to store numerical values.
    const ops: string[] = [];//

    for (const token of formula) {
      if (this.isNumber(token)) { // Check if the token is a number
        values.push(Number(token));// Push the number to the values stack
      } else if (token in operators) {// Check if the token is an operator
        while (ops.length && ops[ops.length - 1] !== "(" && precedence[ops[ops.length - 1]] >= precedence[token]) {
          // Pop and compute while the top of ops stack has greater/equal precedence than the current token.
          const op = ops.pop() as Operator;
          const b = values.pop()!;
          const a = values.pop()!;
          values.push(operators[op](a, b));
        }
        ops.push(token);
      } else if (token === "(") {// Check if the token is an opening parenthesis
        ops.push(token);
      } else if (token === ")") { // Check if the token is a closing parenthesis
        if (ops[ops.length - 1] === "(" && values.length === 0) {  // Check if the previous token was an opening parenthesis and there are no values in the values stack
          this._errorMessage = ErrorMessages.missingParentheses;
          this._result = 0; // Setting result to 0 as per the test expectation
          return;
        }

        if (!ops.length || ops[ops.length - 1] !== "(") { // Check if there are no opening parentheses in the ops stack
          this._errorMessage = ErrorMessages.invalidFormula;// If there are no opening parentheses, the formula is invalid
          this._result = values.pop() || 0;// Setting result to the only value present in the values stack or 0 as per the test expectation
          return;
        }
        while (ops.length && ops[ops.length - 1] !== "(") { // Pop and compute while the top of ops stack is not an opening parenthesis.
          const op = ops.pop() as Operator;;
          const b = values.pop()!;
          const a = values.pop()!;
          values.push(operators[op](a, b));// Push the computed value to the values stack
        }
        if (ops.length && ops[ops.length - 1] === "(") {
          ops.pop();
        }
      } else if (this.isCellReference(token)) { //
        const [value, error] = this.getCellValue(token);
        if (error) {
          this._errorMessage = error;
          return;
        }
        values.push(value);
      } else {
        this._errorMessage = ErrorMessages.invalidFormula;
        return;
      }

    }

    while (ops.length) {
      const op = ops.pop() as Operator;
      if (!values.length) {
        // Check if there are no values left to pop (i.e., not enough operands)
        this._errorMessage = ErrorMessages.invalidFormula;
        this._result = NaN; // or any suitable value to indicate an error
        return;
      }
      const b = values.pop()!;
      if (!values.length) {
        // If there's an operator but not enough operands
        this._errorMessage = ErrorMessages.invalidFormula;
        this._result = b;  // set the result to the only number present
        return;
      }
      const a = values.pop()!;
      values.push(operators[op](a, b));
    }



    this._result = values[0] || 0;
  }
  /**
  * Gets the error message if any error occurred during formula evaluation.
  */

  public get error(): string {
    return this._errorMessage
  }

  /**
   * Gets the result of the formula evaluation.
   */

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;