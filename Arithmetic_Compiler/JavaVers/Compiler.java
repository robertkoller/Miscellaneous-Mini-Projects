import java.util.*;

// Compiler class to run the compiler and handle user input
public class Compiler {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String savedExpression = "3 + 4 * 2 / (1 - 5) ^ 2 ^ 3";
        String tempSavedExpression = null;
        String expression = "";

        while (true) {
            System.out.print("Enter an arithmetic expression (or 'exit' to quit, or 'help' for instructions): ");
            expression = scanner.nextLine();
            if (expression.equalsIgnoreCase("exit")) {
                scanner.close();
                break;
            }

            else if (expression.equalsIgnoreCase("save")) {
                if (tempSavedExpression == null) {
                    System.out.println("No expression to save. Please enter an expression first.");
                    continue;
                }
                int invalidIndex = validExpression(tempSavedExpression);
                if (invalidIndex != -1) {
                    System.out.println(
                            "Invalid character at index " + invalidIndex + ": '" + expression.charAt(invalidIndex)
                                    + "'");
                    continue;
                } else {
                    System.out.println("Saved expression: " + tempSavedExpression);
                    savedExpression = tempSavedExpression;
                    continue;
                }

            }

            else if (expression.equalsIgnoreCase("print")) {
                Parser parser = new Parser();
                Node ast = parser.buildTree(savedExpression);
                Compiler.printTree(ast);
                continue;
            }

            else if (expression.equalsIgnoreCase("saved")) {
                System.out.println("Saved expression: " + savedExpression);
                evaluateExpression(savedExpression);
                continue;
            }
            if (expression.equalsIgnoreCase("help")) {
                System.out.println(
                        "Enter a valid arithmetic expression using digits, operators (+-*/^), parentheses, and spaces.");
                System.out.println("Example: 3 + 4 * 2 / (1 - 5) ^ 2 ^ 3");
                System.out.println("\n Special commands:");
                System.out.println("  'exit' - Quit the program");
                System.out.println("  'help' - Show this help message");
                System.out.println("  'save' - Save the last entered expression");
                System.out.println("  'saved' - Show and evaluate the saved expression");
                System.out.println("  'print' - Print the AST of the saved expression");
                continue;
            }

            else {
                int invalidIndex = validExpression(expression);
                if (invalidIndex != -1) {
                    System.out.println(
                            "Invalid character at index " + invalidIndex + ": '" + expression.charAt(invalidIndex)
                                    + "'");
                    continue;
                } else {
                    evaluateExpression(expression);
                    tempSavedExpression = expression;
                    continue;
                }
            }
        }
    }

    // Method to evaluate the expression and print the result
    public static void evaluateExpression(String expression) {
        Parser parser = new Parser();
        Evaluator evaluator = new Evaluator();
        Node ast = parser.buildTree(expression);
        double result = evaluator.evaluate(ast);
        System.out.println("Result: " + result);

    }

    // Check for invalid characters in the expression
    // Returns index of first invalid character, or -1 if all characters are valid
    public static int validExpression(String expression) {
        for (int x = 0; x < expression.length(); x++) {
            char c = expression.charAt(x);
            if (!Character.isDigit(c) && "+-*/^() .".indexOf(c) == -1) {
                return x;
            }
        }

        return -1;
    }


    // Method to print the AST in a readable format
    public static void printTree(Node node) {
        if (node == null) {
            System.out.println("Empty tree");
            return;
        }
        int h = heightTree(node);
        int width = (int) Math.pow(2, h + 1) - 1;
        int rows = h * 2 - 1;
        char[][] canvas = new char[rows][width];
        for (char[] row : canvas)
            Arrays.fill(row, ' ');

        draw(canvas, node, 0, 0, width - 1);

        for (char[] row : canvas)
            System.out.println(new String(row).stripTrailing());
    }

    // Recursive method to draw the tree on the canvas for printing
    private static void draw(char[][] canvas, Node node, int row, int lo, int hi) {
        if (node == null)
            return;
        int mid = (lo + hi) / 2;
        placeLabel(canvas, row, mid, nodeLabel(node));

        if (node instanceof OperatorNode) {
            OperatorNode op = (OperatorNode) node;
            int leftMid = (lo + mid - 1) / 2;
            int rightMid = (mid + 1 + hi) / 2;
            if (row + 1 < canvas.length) {
                canvas[row + 1][(mid + leftMid) / 2] = '/';
                canvas[row + 1][(mid + rightMid) / 2] = '\\';
            }
            draw(canvas, op.left, row + 2, lo, mid - 1);
            draw(canvas, op.right, row + 2, mid + 1, hi);
        }
    }

    // Method to place a label (number or operator) in the canvas for printing the tree
    private static void placeLabel(char[][] canvas, int row, int mid, String label) {
        int start = mid - label.length() / 2;
        for (int i = 0; i < label.length(); i++) {
            int col = start + i;
            if (col >= 0 && col < canvas[row].length)
                canvas[row][col] = label.charAt(i);
        }
    }

    // Method to get the label for a node (number or operator) for printing the tree
    private static String nodeLabel(Node node) {
        if (node instanceof NumberNode) {
            double v = ((NumberNode) node).value;
            return v == (long) v ? String.valueOf((long) v) : String.valueOf(v);
        }
        if (node instanceof OperatorNode)
            return String.valueOf(((OperatorNode) node).op);
        return "?";
    }

    // Method to calculate the height of the tree for printing purposes
    public static int heightTree(Node node) {
        if (node instanceof NumberNode) {
            return 1;
        } else if (node instanceof OperatorNode) {
            OperatorNode opNode = (OperatorNode) node;
            return 1 + Math.max(heightTree(opNode.left), heightTree(opNode.right));
        } else {
            throw new RuntimeException("Unknown node type");
        }
    }

}
