// Parser class to convert an arithmetic expression string into an AST (Abstract Syntax Tree)
public class Parser {

    // Main method to build the AST from the input expression
    public Node buildTree(String expression) {
        expression = expression.replaceAll("\\s", "");
        return buildTreeRecursive(expression, 0, null);
    }

    // Recursive method to build the AST, handling operator precedence and parentheses
    private Node buildTreeRecursive(String expression, int index, Node current){
        int opIndex = findOperatorIndex(expression);
        if (opIndex == -1) {
            if (expression.startsWith("(") && expression.endsWith(")")) {
                return buildTreeRecursive(expression.substring(1, expression.length() - 1), 0, null);
                
            } else {
                return new NumberNode(Double.parseDouble(expression));
            }
        }
        else {
            char op = expression.charAt(opIndex);
            String leftExpr = expression.substring(0, opIndex);
            String rightExpr = expression.substring(opIndex + 1);
            Node leftNode = buildTreeRecursive(leftExpr, 0, null);
            Node rightNode = buildTreeRecursive(rightExpr, 0, null);
            return new OperatorNode(op, leftNode, rightNode);
        }

    }

    // Method to find the index of the operator with the lowest precedence that is not inside parentheses
    private int findOperatorIndex(String expression) {
        int depth = 0;
        int lastOpIndex = -1;
        boolean foundMulDiv = false;

        // Single pass right-to-left: +/- first (lowest precedence), then */÷, then ^ (leftmost wins via overwrite)
        for (int x = expression.length() - 1; x >= 0; x--) {
            char c = expression.charAt(x);
            if (c == ')') depth++;
            else if (c == '(') depth--;
            else if (depth == 0 && (c == '+' || c == '-')) {
                return x;
            }
            else if (depth == 0 && (c == '*' || c == '/') && !foundMulDiv) {
                lastOpIndex = x;
                foundMulDiv = true;
            }
            else if (depth == 0 && c == '^' && !foundMulDiv) {
                lastOpIndex = x; // keep overwriting — last write in right-to-left scan = leftmost ^
            }
        }
        
        return lastOpIndex;
    }
}