public class Game {
    int[][] board = new int[4][4];
    int size;
    int highest;
    int score;

    public Game() {
        highest = 0;
        score = 0;
        putRandomTile();
        putRandomTile();
        size = 2;

    }
    /*
    public void runGame() {
        System.out.println(this.toString());
        Scanner scanner = new Scanner(System.in);
        while (true) {
            if (size >= 16) {
                System.out.println("Game Over!");
                break;
            }
            if (highest >= 2048) {
                System.out.println("You Win!");
                break;
            }
            System.out.println("Type 1 to move up, 2 to move down, 3 to move left, 4 to move right, or 5 to exit:");
            String input = scanner.nextLine();
            if (input.equals("1")) {
                if (moveUp()) {
                    putRandomTile();
                } else {
                    System.out.println("Move not possible. No tiles can move up.");
                }
            } else if (input.equals("2")) {
                if (moveDown()){
                    putRandomTile();
                }
                else{
                    System.out.println("Move not possible. No tiles can move down.");
                }
            } else if (input.equals("3")) {
                if (moveLeft()){
                    putRandomTile();
                }
                else{
                    System.out.println("Move not possible. No tiles can move left.");
                }
            } else if (input.equals("4")) {
                if (moveRight()){
                    putRandomTile();
                }
                else{
                    System.out.println("Move not possible. No tiles can move right.");
                }
            } else if (input.equals("5")) {
                System.out.println("Exiting game.");
                break;
            } else {
                System.out.println("Invalid input. Please try again.");
                continue;
            }
            System.out.println(this.toString());
        }
        scanner.close();
    }
        */

    private int pickTile() {
        double randomValue = Math.random();
        if (randomValue < 0.9) {
            return 2;
        } else {
            return 4;
        }
    }

    private int pickSpot() {
        while (true) {
            int row = (int) (Math.random() * 4);
            int col = (int) (Math.random() * 4);
            if (board[row][col] == 0) {
                return row * 4 + col;
            }
        }
    }

    public void putRandomTile() {
        int spot = pickSpot();
        int tile = pickTile();
        board[spot / 4][spot % 4] = tile;
        if (tile > highest) {
            highest = tile;
        }
        size++;
    }

    public boolean moveDown() {
        boolean moved = false;
        for (int col = 0; col < 4; col++) {
            for (int row = 2; row >= 0; row--) {
                if (board[row][col] != 0) {
                    int targetRow = row;
                    while (targetRow + 1 < 4 && board[targetRow + 1][col] == 0) {
                        targetRow++;
                    }
                    if (targetRow + 1 < 4 && board[targetRow + 1][col] == board[row][col]) {
                        connectTiles(targetRow + 1, col);
                        board[row][col] = 0;
                        moved = true;
                        while (targetRow + 2 < 4) {
                            if (board[targetRow + 1][col] == board[targetRow + 2][col]) {
                                connectTiles(targetRow + 2, col);
                                board[targetRow + 1][col] = 0;
                            } else {
                                break;
                            }
                        }
                    } else if (targetRow != row) {
                        board[targetRow][col] = board[row][col];
                        board[row][col] = 0;
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    public boolean moveUp() {
        boolean moved = false;
        for (int col = 0; col < 4; col++) {
            for (int row = 1; row < 4; row++) {
                if (board[row][col] != 0) {
                    int targetRow = row;
                    while (targetRow - 1 >= 0 && board[targetRow - 1][col] == 0) {
                        targetRow--;
                    }
                    if (targetRow - 1 >= 0 && board[targetRow - 1][col] == board[row][col]) {
                        connectTiles(targetRow - 1, col);
                        board[row][col] = 0;
                        moved = true;
                        while (targetRow - 2 >= 0) {
                            if (board[targetRow - 1][col] == board[targetRow - 2][col]) {
                                connectTiles(targetRow - 2, col);
                                board[targetRow - 1][col] = 0;
                            } else {
                                break;
                            }
                        }
                    } else if (targetRow != row) {
                        board[targetRow][col] = board[row][col];
                        board[row][col] = 0;
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    public boolean moveLeft() {
        boolean moved = false;
        for (int row = 0; row < 4; row++) {
            for (int col = 1; col < 4; col++) {
                if (board[row][col] != 0) {
                    int targetCol = col;
                    while (targetCol - 1 >= 0 && board[row][targetCol - 1] == 0) {
                        targetCol--;
                    }
                    if (targetCol - 1 >= 0 && board[row][targetCol - 1] == board[row][col]) {
                        connectTiles(row, targetCol - 1);
                        board[row][col] = 0;
                        moved = true;
                        while (targetCol - 2 >= 0) {
                            if (board[row][targetCol - 1] == board[row][targetCol - 2]) {
                                connectTiles(row, targetCol - 2);
                                board[row][targetCol - 1] = 0;
                            } else {
                                break;
                            }
                        }
                    } else if (targetCol != col) {
                        board[row][targetCol] = board[row][col];
                        board[row][col] = 0;
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    public boolean moveRight() {
        boolean moved = false;
        for (int row = 0; row < 4; row++) {
            for (int col = 2; col >= 0; col--) {
                if (board[row][col] != 0) {
                    int targetCol = col;
                    while (targetCol + 1 < 4 && board[row][targetCol + 1] == 0) {
                        targetCol++;
                    }
                    if (targetCol + 1 < 4 && board[row][targetCol + 1] == board[row][col]) {
                        connectTiles(row, targetCol + 1);
                        board[row][col] = 0;
                        moved = true;
                        while (targetCol + 2 < 4) {
                            if (board[row][targetCol + 1] == board[row][targetCol + 2]) {
                                connectTiles(row, targetCol + 2);
                                board[row][targetCol + 1] = 0;
                            } else {
                                break;
                            }
                        }
                    } else if (targetCol != col) {
                        board[row][targetCol] = board[row][col];
                        board[row][col] = 0;
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    public String toString() {
        String output = "\n";
        output += "------------------\n";
        for (int row = 0; row < 4; row++) {
            output += "| " + board[row][0] + " | " + board[row][1] + " | " + board[row][2] + " | " + board[row][3]
                    + " |\n";
        }
        output += "------------------\n";
        output += "Score: " + score + "\n";
        output += "Highest Tile: " + highest + "\n";
        return output;
    }

    private void connectTiles(int xSpot, int ySpot) {
        board[xSpot][ySpot] *= 2;
        score += board[xSpot][ySpot];
        if (board[xSpot][ySpot] > highest) {
            highest = board[xSpot][ySpot];
        }
        size--;
    }
    public int getSize() {
    return size;
}

public int getHighest() {
    return highest;
}
}

