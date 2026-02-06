package BasicConsoleVersion;
import java.util.Scanner;

public class ConsoleGame {
    private Game game;

    public ConsoleGame() {
        game = new Game();
    }

    public void run() {
        Scanner scanner = new Scanner(System.in);
        System.out.println(game);

        while (true) {
            if (game.getSize() >= 16) {
                System.out.println("Game Over!");
                break;
            }

            if (game.getHighest() >= 2048) {
                System.out.println("You Win!");
                break;
            }

            System.out.println(
                "Type 1 to move up, 2 to move down, 3 to move left, 4 to move right, or 5 to exit:"
            );

            String input = scanner.nextLine();
            boolean moved = false;

            switch (input) {
                case "1":
                    moved = game.moveUp();
                    break;
                case "2":
                    moved = game.moveDown();
                    break;
                case "3":
                    moved = game.moveLeft();
                    break;
                case "4":
                    moved = game.moveRight();
                    break;
                case "5":
                    System.out.println("Exiting game.");
                    scanner.close();
                    return;
                default:
                    System.out.println("Invalid input.");
                    continue;
            }

            if (moved) {
                game.putRandomTile();
            } else {
                System.out.println("Move not possible.");
            }

            System.out.println(game);
        }

        scanner.close();
    }
}
