#include <iostream>
using namespace std;

// Abstract base class for all nodes
class Node {
    public:
        virtual ~Node() {}
};

// Leaf node — holds a number
class NumberNode : public Node {
    public:
        double value;

        NumberNode(double val){
            value = val;
        }
};

// Inner node — holds an operator and two children
class OperatorNode : public Node {
    public:
        char op;
        Node* left;
        Node* right;

        OperatorNode(char op, Node* left, Node* right){
            this->op = op;
            this->left = left;
            this->right = right;
        }
            

        ~OperatorNode() {
            delete left;
            delete right;
        }
};

double calculateTree(Node* node){
    if (dynamic_cast<OperatorNode*>(node)){
        double left = calculateTree(node->left);
    }
    return 0;
};

int main() {
    // Manually build the tree for (5 + 3) * 5
    //
    //        *
    //       / \
    //      +   5
    //     / \
    //    5   3

    Node* tree = new OperatorNode('*',
        new OperatorNode('+',
            new NumberNode(5),
            new NumberNode(3)
        ),
        new NumberNode(5)
    );
    cout << calculateTree(tree) << endl;

    cout << "Tree built successfully" << endl;

    delete tree;
    return 0;
}


