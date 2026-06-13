// OperatorNode class used to store operators and their left and right children in the AST
public class OperatorNode extends Node {
    public char op;
    public Node left;
    public Node right;

    public OperatorNode(char op, Node left, Node right) {
        this.op = op;
        this.left = left;
        this.right = right;
    }
}
