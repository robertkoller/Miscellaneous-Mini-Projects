// Parser class to convert an arithmetic expression string into an AST (Abstract Syntax Tree)
public class Parser {

    // Main method to build the AST from the input expression
    public Node buildTree(String expression) {
        expression = reformatExpression(expression);
        return buildTreeRecursive(expression, 0, expression.length());
    }

    // Recursive method to build the AST using start/end indices to avoid O(n²) substring creation
    private Node buildTreeRecursive(String expression, int start, int end) {
        int opIndex = findOperatorIndex(expression, start, end);
        if (opIndex == -1) {
            if (expression.charAt(start) == '(' && expression.charAt(end - 1) == ')') {
                return buildTreeRecursive(expression, start + 1, end - 1);
            } else {
                return new NumberNode(Double.parseDouble(expression.substring(start, end)));
            }
        } else {
            char op = expression.charAt(opIndex);
            Node leftNode = buildTreeRecursive(expression, start, opIndex);
            Node rightNode = buildTreeRecursive(expression, opIndex + 1, end);
            return new OperatorNode(op, leftNode, rightNode);
        }
    }

    // Method to find the index of the operator with the lowest precedence that is not inside parentheses
    private int findOperatorIndex(String expression, int start, int end) {
        int depth = 0;
        int lastOpIndex = -1;
        boolean foundMulDiv = false;

        // Single pass right-to-left: +/- first (lowest precedence), then */÷, then ^ (leftmost wins via overwrite)
        for (int x = end - 1; x >= start; x--) {
            char c = expression.charAt(x);
            if (c == ')') {
                depth++;
            } else if (c == '(') {
                depth--;
            } else if (depth == 0 && (c == '+' || c == '-')) {
                return x;
            } else if (depth == 0 && (c == '*' || c == '/') && !foundMulDiv) {
                lastOpIndex = x;
                foundMulDiv = true;
            } else if (depth == 0 && c == '^' && !foundMulDiv) {
                lastOpIndex = x; // keep overwriting — last write in right-to-left scan = leftmost ^
            }
        }

        return lastOpIndex;
    }

    // Method to reformat the expression using stringbuilder cuz stringbuilder more efficient
    private String reformatExpression(String expression) {
        StringBuilder sb = new StringBuilder(expression.replaceAll("\\s", ""));
        for (int x = 0; x < sb.length() - 1; x++) {
            char c1 = sb.charAt(x);
            char c2 = sb.charAt(x + 1);

            // Implicit multiplication: digit(, )digit, or )(
            if ((Character.isDigit(c1) && c2 == '(')
                    || (c1 == ')' && Character.isDigit(c2))
                    || (c1 == ')' && c2 == '(')) {
                sb.insert(x + 1, '*');
                x++;
            }
            // Unary minus
            else if (c1 == '-' && (x == 0 || isOperatorOrOpenParen(sb.charAt(x - 1)))) {
                if (Character.isDigit(c2) || c2 == '.') {
                    int end = x + 1;
                    while (end < sb.length() && (Character.isDigit(sb.charAt(end)) || sb.charAt(end) == '.')) {
                        end++;
                    }
                    end = consumeExponents(sb, end);
                    sb.insert(end, ')');
                    sb.insert(x, "(0");
                    x = end + 1;
                } else if (c2 == '(') {
                    int depth = 0, end = x + 1;
                    while (end < sb.length()) {
                        if (sb.charAt(end) == '(') depth++;
                        else if (sb.charAt(end) == ')' && --depth == 0) { end++; break; }
                        end++;
                    }
                    end = consumeExponents(sb, end);
                    sb.insert(end, ')');
                    sb.insert(x, "(0");
                    x = end + 1;
                }
            }
        }
        return sb.toString();
    }

    // Advances end past any ^exponent chains so unary minus wraps the full power expression
    // -2^3 becomes (0-2^3), not (0-2)^3
    private int consumeExponents(StringBuilder sb, int end) {
        while (end < sb.length() && sb.charAt(end) == '^') {
            end++; // skip ^
            if (end < sb.length() && sb.charAt(end) == '(') {
                int depth = 0;
                while (end < sb.length()) {
                    if (sb.charAt(end) == '(') depth++;
                    else if (sb.charAt(end) == ')' && --depth == 0) { end++; break; }
                    end++;
                }
            } else {
                while (end < sb.length() && (Character.isDigit(sb.charAt(end)) || sb.charAt(end) == '.')) {
                    end++;
                }
            }
        }
        return end;
    }

    // Helper method to check if a character is an operator or an open parenthesis
    private boolean isOperatorOrOpenParen(char c) {
        return c == '+' || c == '-' || c == '*' || c == '/' || c == '^' || c == '(';
    }
}
