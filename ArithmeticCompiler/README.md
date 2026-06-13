# Arithmetic Compiler

A calculator that works by parsing an expression into an AST (Abstract Syntax Tree) and then evaluating it. It's like a calculator but cooler.

I made this project to practice recursion, tree data structures, and to build something in Java.

---

## How it works

**Reformatting** — Before parsing, the expression is preprocessed: whitespace is stripped, implicit multiplication is inserted (e.g. `3(2+4)` → `3*(2+4)`), and unary minus is rewritten as a subtraction from zero (e.g. `-5` → `(0-5)`, `-2^2` → `(0-2^2)`).

**Parsing** — The reformatted string is recursively split at the lowest-precedence operator at the outermost level (not inside parentheses). That operator becomes the root of the subtree, with the left and right substrings becoming its children. Repeating this builds the full AST. Indices into the original string are used throughout to avoid O(n²) substring allocation.

**Operator precedence** (lowest to highest):
1. `+` `-`
2. `*` `/`
3. `^`

`^` is right-associative — `2^3^2` is evaluated as `2^(3^2) = 512`, not `(2^3)^2 = 64`.

**Evaluation** — The AST is walked recursively. Leaf nodes (numbers) return their value. Operator nodes evaluate their left and right subtrees and apply the operator.

### Example: `3 + 4 * 2`

```
    +
   / \
  3   *
     / \
    4   2
```
`*` binds tighter, so it becomes the child. Result: `3 + 8 = 11`.

---

## Usage

```
cd JavaVers
javac *.java
java Compiler
```

Enter any arithmetic expression at the prompt.

```
Enter an arithmetic expression (or 'exit' to quit, or 'help' for instructions): 3 + 4 * 2
Result: 11.0
```

### Supported syntax

| Syntax | Example | Notes |
|--------|---------|-------|
| Integers | `3 + 5` | |
| Decimals | `3.14 * 2` | Digit required on both sides of `.` |
| Operators | `+ - * / ^` | |
| Parentheses | `(1 + 2) * 3` | |
| Implicit multiplication | `3(2+4)`, `(1+2)(3+4)` | `*` inserted automatically |
| Unary minus | `-5`, `-2^2`, `-(3+2)` | Rewired to `(0-...)` before parsing |
| Nested expressions | `3 + 4 * 2 / (1 - 5) ^ 2 ^ 3` | |

### Special commands

| Command | Description |
|---------|-------------|
| `help`  | Show usage instructions |
| `save`  | Save the last evaluated expression |
| `saved` | Evaluate and display the saved expression |
| `print` | Print the AST of the saved expression |
| `exit`  | Quit the program |

### Visualizing the AST

The `print` command draws the tree. For `3 + 4 * 2 / (1 - 5) ^ 2 ^ 3`:

```
               +
       /               \
   3                       /
                       /       \
                   *               ^
                 /   \           /   \
               4       2       -       ^
                              / \     / \
                             1   5   2   3
```

---

## Running the tests

```
cd JavaVers
javac *.java
java CompilerTest
```

Tests cover basic operations, operator precedence, parentheses, implicit multiplication, unary minus, decimals, and input validation.

---

## Project structure

```
JavaVers/
  Compiler.java     -- entry point, REPL loop, input validation, tree printing
  Parser.java       -- expression reformatting and AST construction
  Evaluator.java    -- walks the AST and computes the result
  Node.java         -- abstract base class for tree nodes
  OperatorNode.java -- node holding an operator and two children
  NumberNode.java   -- leaf node holding a numeric value
  CompilerTest.java -- test suite
```
