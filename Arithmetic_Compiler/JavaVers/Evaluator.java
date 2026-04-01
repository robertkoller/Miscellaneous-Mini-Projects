// Evaluator class to evaluate the sorted AST and compute the result
public class Evaluator {

    public static double evaluate(Node node) {
        if (node instanceof NumberNode){
            return ((NumberNode) node).value;
        } else if (node instanceof OperatorNode){
            OperatorNode opNode = (OperatorNode) node;
            double leftVal = evaluate(opNode.left);
            double rightVal = evaluate(opNode.right);
            switch (opNode.op) {
                case '+': return leftVal + rightVal;
                case '-': return leftVal - rightVal;
                case '*': return leftVal * rightVal;
                case '/': return leftVal / rightVal;
                case '^': return Math.pow(leftVal, rightVal);
                default:  throw new RuntimeException("Unknown operator: " + opNode.op);
            }
        } else {
            throw new RuntimeException("Unknown node type");
        }
    }
}
