import java.util.*;

public class Game {

    public final int[][] board = new int[4][4];
    public final int[] tempLine = new int[4];

    private int size;
    private int highest;
    private int score;

    public Game() {
        highest = 0;
        score = 0;
        size = 0;
        putRandomTile();
        putRandomTile();
    }

    private int pickTile() {
        return Math.random() < 0.9 ? 2 : 4;
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
        highest = Math.max(highest, tile);
        size++;
    }

    public boolean moveLeft() {
        boolean moved = false;

        for (int row = 0; row < 4; row++) {
            System.arraycopy(board[row], 0, tempLine, 0, 4);
            int[] merged = mergeLine(tempLine);

            if (!Arrays.equals(board[row], merged)) {
                moved = true;
            }
            board[row] = merged;
        }

        return moved;
    }

    public boolean moveRight() {
        boolean moved = false;

        for (int row = 0; row < 4; row++) {
            for (int col = 0; col < 4; col++) {
                tempLine[col] = board[row][3 - col];
            }

            int[] merged = mergeLine(tempLine);

            for (int col = 0; col < 4; col++) {
                if (board[row][3 - col] != merged[col]) {
                    moved = true;
                }
                board[row][3 - col] = merged[col];
            }
        }

        return moved;
    }

    public boolean moveUp() {
        boolean moved = false;

        for (int col = 0; col < 4; col++) {
            for (int row = 0; row < 4; row++) {
                tempLine[row] = board[row][col];
            }

            int[] merged = mergeLine(tempLine);

            for (int row = 0; row < 4; row++) {
                if (board[row][col] != merged[row]) {
                    moved = true;
                }
                board[row][col] = merged[row];
            }
        }

        return moved;
    }

    public boolean moveDown() {
        boolean moved = false;

        for (int col = 0; col < 4; col++) {
            for (int row = 0; row < 4; row++) {
                tempLine[row] = board[3 - row][col];
            }

            int[] merged = mergeLine(tempLine);

            for (int row = 0; row < 4; row++) {
                if (board[3 - row][col] != merged[row]) {
                    moved = true;
                }
                board[3 - row][col] = merged[row];
            }
        }

        return moved;
    }

    private int[] mergeLine(int[] line) {
        int[] result = new int[4];
        int index = 0;
        for (int i = 0; i < 4; i++) {
            if (line[i] != 0) {
                result[index++] = line[i];
            }
        }
        for (int i = 0; i < 3; i++) {
            if (result[i] != 0 && result[i] == result[i + 1]) {
                result[i] *= 2;
                score += result[i];
                highest = Math.max(highest, result[i]);
                size--;
                for (int j = i + 1; j < 3; j++) {
                    result[j] = result[j + 1];
                }
                result[3] = 0;
            }
        }

        return result;
    }

    public int getSize() {
        return size;
    }

    public int getHighest() {
        return highest;
    }

    public int getScore() {
        return score;
    }

    public int[][] getBoard() {
        return board;
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
}