package BasicConsoleVersion;
import javax.swing.*;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;

public class SwingGameUI extends JFrame {
    private Game game;
    private JLabel[][] cells = new JLabel[4][4];

    public SwingGameUI() {
        game = new Game();
        setTitle("2048");
        setSize(400, 400);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(new GridLayout(4, 4));

        Font font = new Font("Arial", Font.BOLD, 24);

        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                JLabel label = new JLabel("", SwingConstants.CENTER);
                label.setBorder(BorderFactory.createLineBorder(Color.GRAY));
                label.setFont(font);
                cells[i][j] = label;
                add(label);
            }
        }

        addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                boolean moved = false;

                switch (e.getKeyCode()) {
                    case KeyEvent.VK_UP:
                        moved = game.moveUp();
                        break;
                    case KeyEvent.VK_DOWN:
                        moved = game.moveDown();
                        break;
                    case KeyEvent.VK_LEFT:
                        moved = game.moveLeft();
                        break;
                    case KeyEvent.VK_RIGHT:
                        moved = game.moveRight();
                        break;
                }

                if (moved) {
                    game.putRandomTile();
                    updateBoard();
                }
            }
        });

        updateBoard();
        setFocusable(true);
        setVisible(true);
    }

    private void updateBoard() {
        int[][] board = game.board; // we’ll clean this up later

        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                cells[i][j].setText(
                    board[i][j] == 0 ? "" : String.valueOf(board[i][j])
                );
            }
        }
    }
}
