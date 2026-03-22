# Arithmetic Compiler

A calculator that works by parsing an expression into an AST (Abstract Syntax Tree) and then evaluating it. It's like a calculator but cooler.

I made this project to practice recursion, tree data structures, and to build something in Java.

---

## How it works

**Parsing** — The expression string is recursively split at the lowest-precedence operator at the outermost level (not inside parentheses). This is the operator that becomes the root of the subtree, with the left and right substrings becoming its children. Repeating this bottom-up builds the full AST.

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

| Syntax | Example |
|--------|---------|
| Integers | `3 + 5` |
| Decimals | `3.14 * 2` |
| Operators | `+ - * / ^` |
| Parentheses | `(1 + 2) * 3` |
| Nested expressions | `3 + 4 * 2 / (1 - 5) ^ 2 ^ 3` |

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

## Project structure

```
JavaVers/
  Compiler.java     -- entry point, REPL loop, tree printing
  Parser.java       -- builds the AST from an expression string
  Evaluator.java    -- walks the AST and computes the result
  Node.java         -- abstract base class for tree nodes
  OperatorNode.java -- node holding an operator and two children
  NumberNode.java   -- leaf node holding a numeric value
```

---

## Limitations

- No support for unary minus (write `(0 - 2)` instead of `-2`)
- No support for implicit multiplication (e.g. `2(3+4)` won't work)
- Numbers must have digits on both sides of `.` (e.g. `0.5`, not `.5`)
