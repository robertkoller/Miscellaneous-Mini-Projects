// Testing for the arithmetic compiler (Parser + Evaluator + Compiler.validExpression)
public class CompilerTest {

    static int passed = 0;
    static int failed = 0;
    static final double EPSILON = 1e-9;

    public static void main(String[] args) {
        testEval();
        testValidExpression();
        System.out.println("\n" + passed + " passed, " + failed + " failed.");
    }

    // Evaluation tests for various expressions, checking that the evaluated result matches the expected value within a small epsilon for floating-point comparisons. Also checks that no exceptions are thrown for valid expressions, and prints pass/fail messages for each test case.
    static void testEval() {
        System.out.println("=== Evaluation ===");

        // Basic operations
        eval("3+4",              7);
        eval("10-3",             7);
        eval("6*7",              42);
        eval("15/3",             5);
        eval("2^10",             1024);

        // Whitespace ignored
        eval("3 + 4 * 2",        11);

        // Operator precedence
        eval("2+3*4",            14);
        eval("10-2*3",           4);
        eval("4/2+1",            3);
        eval("2+3^2*4-1",        37);

        // Left-associativity of - and /
        eval("10-3-2",           5);
        eval("24/4/2",           3);

        // Right-associativity of ^
        eval("2^3^2",            512);    // 2^(3^2) = 2^9
        eval("4^3^2",            262144); // 4^(3^2) = 4^9

        // Parentheses
        eval("(2+3)*4",          20);
        eval("(10-2)*(3+1)",     32);
        eval("((2+3)*4)-5",      15);
        eval("((((1+1))))",      2);
        eval("(3+4)^2",          49);

        // Implicit multiplication
        eval("3(2+4)",           18);
        eval("(2+3)(4+5)",       45);
        eval("(10-3)2",          14);
        eval("2(3)(4)",          24);
        eval("3(2+4)^2",         108); // 3*36

        // Unary minus — basic
        eval("-5+3",             -2);
        eval("-15+5",            -10);
        eval("-(3+2)",           -5);
        eval("3*-2",             -6);
        eval("5+-3",             2);
        eval("5--3",             8);

        // Unary minus before ( with following ops
        eval("-(3+2)+10",        5);
        eval("-(2+3)(4+1)",      -25);

        // Unary minus + exponent (the fixed bug)
        eval("-2^2",             -4);
        eval("-3^2",             -9);
        eval("-2^3^2",           -512); // -(2^(3^2)) = -(2^9)
        eval("-(3+2)^2",         -25);
        eval("-2^2+10",          6);

        // Implicit multiply after unary wrap
        eval("-2(5+3)",          -16);
        eval("-3(2+5)^2",        -147);

        // Decimals
        eval("1.5+2.5",          4);
        eval("3.14*2",           6.28);
        eval("10/4",             2.5);

        // Larger expressions
        eval("3^4+5*(12-4)^2/(8*2)-7*(3+2)",                     66);
        eval("-3(2+5)^2+4^3*(6-2)/8+100",                        -15);
        eval("(2^3+4^2)*(15-3*2)/(6+2*3)-5^2+3*(4+2)^2-1",      100);
        eval("3+4*2/(1-5)^2^3",  3.0001220703125);
    }

    // Checks that validExpression correctly identifies valid/invalid expressions, and that evaluation of valid expressions gives expected results. Also prints pass/fail messages for each test case.
    static void testValidExpression() {
        System.out.println("\n=== validExpression ===");

        valid("3+4",       true);
        valid("(3+4)*2",   true);
        valid("3.14+1",    true);
        valid("-5+3",      true);

        valid("3+",        true);   // syntactically odd but no invalid chars
        valid("(3+5",      false);  // unclosed paren — fixed bug
        valid("((3+5)",    false);  // unclosed paren
        valid("3+5)",      false);  // unexpected close
        valid("3+5)",      false);
        valid("3@5",       false);  // invalid char
        valid("3+5a",      false);  // invalid char
    }

    // evaluates the expression and checks against expected result, printing pass/fail
    static void eval(String expr, double expected) {
        try {
            double result = Evaluator.evaluate(Parser.buildTree(expr));
            if (Math.abs(result - expected) < EPSILON) {
                pass(expr + " = " + expected);
            } else {
                fail(expr + " expected " + expected + " but got " + result);
            }
        } catch (Exception e) {
            fail(expr + " threw " + e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }

    // checks if validExpression correctly identifies valid/invalid expressions
    static void valid(String expr, boolean shouldBeValid) {
        int idx = Compiler.validExpression(expr);
        boolean isValid = (idx == -1);
        if (isValid == shouldBeValid) {
            pass("validExpression(\"" + expr + "\") = " + (shouldBeValid ? "valid" : "invalid at " + idx));
        } else {
            fail("validExpression(\"" + expr + "\") expected " + (shouldBeValid ? "valid" : "invalid") + " but got " + (isValid ? "valid" : "invalid at " + idx));
        }
    }

    // Utility methods to print pass/fail messages and keep count
    static void pass(String msg) {
        passed++;
        System.out.println("  PASS  " + msg);
    }

    static void fail(String msg) {
        failed++;
        System.out.println("  FAIL  " + msg);
    }
}
