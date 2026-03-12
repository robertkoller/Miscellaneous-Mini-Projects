// Evaluator class to evaluate the sorted AST and compute the result
public class Evaluator {

    public double evaluate(Node node) {
        return evaluateRecursive(node);
    }

    private double evaluateRecursive(Node node) {
        if (node instanceof NumberNode){
            return ((NumberNode) node).value;
        } else if (node instanceof OperatorNode){
            OperatorNode opNode = (OperatorNode) node;
            double leftVal = evaluateRecursive(opNode.left);
            double rightVal = evaluateRecursive(opNode.right);
            switch (opNode.op) {
                case '+':
                    return leftVal + rightVal;
                case '-':
                    return leftVal - rightVal;
                case '*':
                    return leftVal * rightVal;
                case '/':
                    return leftVal / rightVal;
                case '^':
                    return Math.pow(leftVal, rightVal);
                default:
                    throw new RuntimeException("Unknown operator: " + opNode.op);
            }
        } else {
            throw new RuntimeException("Unknown node type");
        }
    }
}

