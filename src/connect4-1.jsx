"""
Connect Four - Human vs AI
Uses Minimax with Alpha-Beta Pruning
Features: 4 difficulty levels, first-turn selection, reasoning log, decision tree
University Project
"""

import math
import copy
import os
import random

# --- Constants ---
ROWS = 6
COLS = 7
EMPTY = '.'
PLAYER = 'X'   # Human
AI = 'O'        # Computer

# Difficulty settings: (search_depth, mistake_chance)
#   search_depth  = how many moves ahead the AI looks
#   mistake_chance = probability the AI picks a random move instead of the best one
DIFFICULTIES = {
    1: {'name': 'Easy',       'depth': 1, 'mistake_chance': 0.40},
    2: {'name': 'Normal',     'depth': 3, 'mistake_chance': 0.15},
    3: {'name': 'Hard',       'depth': 5, 'mistake_chance': 0.00},
    4: {'name': 'Impossible', 'depth': 7, 'mistake_chance': 0.00},
}


# ============================================================
#  BOARD FUNCTIONS
# ============================================================

def create_board():
    """Create an empty 6x7 board."""
    return [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]


def print_board(board):
    """Display the board in the terminal."""
    print()
    for row in board:
        print('| ' + ' | '.join(row) + ' |')
    print('+' + '---+' * COLS)
    print('  ' + '   '.join(str(i) for i in range(COLS)))
    print()


def is_valid_move(board, col):
    """Check if a column has space."""
    return 0 <= col < COLS and board[0][col] == EMPTY


def get_valid_columns(board):
    """Return list of playable columns."""
    return [c for c in range(COLS) if is_valid_move(board, c)]


def drop_piece(board, col, piece):
    """Drop a piece into a column. Returns the row it landed on."""
    for row in range(ROWS - 1, -1, -1):
        if board[row][col] == EMPTY:
            board[row][col] = piece
            return row
    return -1


def check_winner(board, piece):
    """Check if the given piece has four in a row."""
    # Horizontal
    for r in range(ROWS):
        for c in range(COLS - 3):
            if all(board[r][c + i] == piece for i in range(4)):
                return True
    # Vertical
    for r in range(ROWS - 3):
        for c in range(COLS):
            if all(board[r + i][c] == piece for i in range(4)):
                return True
    # Diagonal /
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            if all(board[r + i][c + i] == piece for i in range(4)):
                return True
    # Diagonal \
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            if all(board[r - i][c + i] == piece for i in range(4)):
                return True
    return False


def is_board_full(board):
    """Check if the board is completely filled."""
    return all(board[0][c] != EMPTY for c in range(COLS))


def is_terminal(board):
    """Check if the game is over."""
    return check_winner(board, PLAYER) or check_winner(board, AI) or is_board_full(board)


# ============================================================
#  HEURISTIC EVALUATION
# ============================================================

def evaluate_window(window, piece):
    """Score a window of 4 cells."""
    opponent = PLAYER if piece == AI else AI
    score = 0

    piece_count = window.count(piece)
    empty_count = window.count(EMPTY)
    opp_count = window.count(opponent)

    if piece_count == 4:
        score += 100
    elif piece_count == 3 and empty_count == 1:
        score += 5
    elif piece_count == 2 and empty_count == 2:
        score += 2

    if opp_count == 3 and empty_count == 1:
        score -= 4

    return score


def score_board(board, piece):
    """Evaluate the entire board with a heuristic score."""
    score = 0

    # Center column preference
    center_col = [board[r][COLS // 2] for r in range(ROWS)]
    score += center_col.count(piece) * 3

    # Horizontal
    for r in range(ROWS):
        for c in range(COLS - 3):
            window = [board[r][c + i] for i in range(4)]
            score += evaluate_window(window, piece)

    # Vertical
    for r in range(ROWS - 3):
        for c in range(COLS):
            window = [board[r + i][c] for i in range(4)]
            score += evaluate_window(window, piece)

    # Diagonals
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            window = [board[r + i][c + i] for i in range(4)]
            score += evaluate_window(window, piece)
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            window = [board[r - i][c + i] for i in range(4)]
            score += evaluate_window(window, piece)

    return score


# ============================================================
#  MINIMAX WITH ALPHA-BETA PRUNING + LOGGING
# ============================================================

def minimax(board, depth, alpha, beta, maximizing, tree_node, prune_count):
    """
    Minimax with Alpha-Beta Pruning.

    Parameters:
        board       - current game state
        depth       - how many levels deeper to search
        alpha       - best score AI can guarantee (starts at -inf)
        beta        - best score Player can guarantee (starts at +inf)
        maximizing  - True = AI's turn (max), False = Player's turn (min)
        tree_node   - dict recording this node in the decision tree
        prune_count - mutable list [int] counting total prunes

    Returns:
        (best_column, best_score)
    """
    valid_cols = get_valid_columns(board)

    # --- Base cases ---
    if depth == 0 or is_terminal(board):
        if check_winner(board, AI):
            tree_node['score'] = 100000
            tree_node['reason'] = 'AI wins!'
            return (None, 100000)
        elif check_winner(board, PLAYER):
            tree_node['score'] = -100000
            tree_node['reason'] = 'Player wins!'
            return (None, -100000)
        elif is_board_full(board):
            tree_node['score'] = 0
            tree_node['reason'] = 'Draw'
            return (None, 0)
        else:
            s = score_board(board, AI)
            tree_node['score'] = s
            tree_node['reason'] = f'Heuristic = {s}'
            return (None, s)

    tree_node['children'] = []

    if maximizing:
        best_score = -math.inf
        best_col = valid_cols[0]

        for col in valid_cols:
            temp = copy.deepcopy(board)
            drop_piece(temp, col, AI)

            child = {'col': col, 'who': 'AI', 'pruned': False, 'children': []}
            tree_node['children'].append(child)

            _, sc = minimax(temp, depth - 1, alpha, beta, False, child, prune_count)
            child['score'] = sc

            if sc > best_score:
                best_score = sc
                best_col = col

            alpha = max(alpha, best_score)
            if alpha >= beta:
                prune_count[0] += 1
                for rc in valid_cols:
                    if rc > col:
                        tree_node['children'].append({
                            'col': rc, 'who': 'AI', 'pruned': True,
                            'score': None, 'children': []
                        })
                break

        tree_node['score'] = best_score
        tree_node['best_col'] = best_col
        return (best_col, best_score)

    else:
        best_score = math.inf
        best_col = valid_cols[0]

        for col in valid_cols:
            temp = copy.deepcopy(board)
            drop_piece(temp, col, PLAYER)

            child = {'col': col, 'who': 'Player', 'pruned': False, 'children': []}
            tree_node['children'].append(child)

            _, sc = minimax(temp, depth - 1, alpha, beta, True, child, prune_count)
            child['score'] = sc

            if sc < best_score:
                best_score = sc
                best_col = col

            beta = min(beta, best_score)
            if alpha >= beta:
                prune_count[0] += 1
                for rc in valid_cols:
                    if rc > col:
                        tree_node['children'].append({
                            'col': rc, 'who': 'Player', 'pruned': True,
                            'score': None, 'children': []
                        })
                break

        tree_node['score'] = best_score
        tree_node['best_col'] = best_col
        return (best_col, best_score)


# ============================================================
#  AI MOVE WITH FULL LOGGING
# ============================================================

def ai_move(board, difficulty):
    """
    Run minimax at the given difficulty and return the best column,
    plus a step-by-step log and decision tree.

    On Easy/Normal, the AI has a chance to make a random "mistake"
    move instead of the optimal one.
    """
    settings = DIFFICULTIES[difficulty]
    depth = settings['depth']
    mistake_chance = settings['mistake_chance']

    tree = {'col': None, 'who': 'ROOT', 'children': [], 'pruned': False}
    prune_count = [0]

    best_col, score = minimax(board, depth, -math.inf, math.inf, True, tree, prune_count)

    # --- Mistake logic for Easy / Normal ---
    made_mistake = False
    chosen_col = best_col
    valid = get_valid_columns(board)

    if mistake_chance > 0 and random.random() < mistake_chance and len(valid) > 1:
        # Pick a random column that isn't the best one
        other_cols = [c for c in valid if c != best_col]
        if other_cols:
            chosen_col = random.choice(other_cols)
            made_mistake = True

    # --- Build step-by-step log ---
    steps = []
    steps.append(f"  [1] Difficulty: {settings['name']} (depth={depth}, mistake={int(mistake_chance*100)}%)")
    steps.append(f"  [2] AI evaluates {len(valid)} possible columns: {valid}")

    step_num = 3
    for child in tree.get('children', []):
        c = child['col']
        if child['pruned']:
            steps.append(f"  [{step_num}] Col {c}: PRUNED (skipped - can't beat current best)")
        else:
            s = child['score']
            if s >= 100000:
                label = 'WINNING move!'
            elif s <= -100000:
                label = 'LOSING'
            else:
                label = f'score {s}'
            marker = '  <<<  BEST' if c == best_col else ''
            steps.append(f"  [{step_num}] Col {c}: {label}{marker}")
        step_num += 1

    steps.append(f"  [{step_num}] Alpha-beta pruned {prune_count[0]} branches total")
    step_num += 1

    score_label = 'WIN' if score >= 100000 else ('LOSE' if score <= -100000 else str(score))
    steps.append(f"  [{step_num}] Optimal move: Column {best_col} (score: {score_label})")
    step_num += 1

    if made_mistake:
        steps.append(f"  [{step_num}] MISTAKE! AI randomly chose column {chosen_col} instead")
    else:
        steps.append(f"  [{step_num}] DECISION: Play column {chosen_col}")

    return chosen_col, steps, tree


# ============================================================
#  DECISION TREE PRINTER
# ============================================================

def format_score(node):
    """Format a node's score for display."""
    s = node.get('score')
    if s is None:
        return '?'
    if s >= 100000:
        return 'WIN'
    if s <= -100000:
        return 'LOSE'
    return str(s)


def print_tree(node, prefix='', is_last=True, max_depth=2, current_depth=0):
    """
    Print the decision tree using box-drawing characters.

    Example output:
        AI Root [score: 5]
        +-- Col 0 (AI) [5]
        |   +-- Col 0 (Player) [3]
        |   +-- Col 1 (Player) [5]
        |   +-- Col 2 (Player) [PRUNED]  ~pruned~
        +-- Col 1 (AI) [3]
        +-- Col 2 (AI) [PRUNED]  ~pruned~
    """
    if current_depth > max_depth:
        return

    # Build label
    if node['who'] == 'ROOT':
        label = f"AI Root [score: {format_score(node)}]"
    elif node['pruned']:
        label = f"Col {node['col']} ({node['who']}) [PRUNED]"
    else:
        label = f"Col {node['col']} ({node['who']}) [{format_score(node)}]"

    # Connector
    if current_depth == 0:
        connector = ''
    elif is_last:
        connector = '+-- '
    else:
        connector = '+-- '

    suffix = '  ~pruned~' if node.get('pruned') and current_depth > 0 else ''
    print(prefix + connector + label + suffix)

    # Recurse into children
    children = node.get('children', [])
    if current_depth < max_depth and children:
        child_prefix = prefix + ('    ' if is_last or current_depth == 0 else '|   ')
        for i, child in enumerate(children):
            print_tree(child, child_prefix, i == len(children) - 1, max_depth, current_depth + 1)


def print_ai_reasoning(steps, tree):
    """Print the full AI reasoning: log + tree."""
    print()
    print('=' * 60)
    print('                     AI REASONING')
    print('=' * 60)

    # Step-by-step log
    print()
    print('  STEP-BY-STEP LOG:')
    print('  ' + '-' * 50)
    for step in steps:
        print(step)

    # Decision tree
    print()
    print('  DECISION TREE:')
    print('  ' + '-' * 50)
    print_tree(tree, prefix='  ', max_depth=2)
    print()

    # Legend
    print('  LEGEND:')
    print('    AI     = Maximizing player (wants highest score)')
    print('    Player = Minimizing player (wants lowest score)')
    print('    WIN    = AI has a guaranteed winning path')
    print('    LOSE   = AI will lose if opponent plays well')
    print('    PRUNED = Branch skipped (alpha-beta pruning)')
    print('    Score  = Heuristic board evaluation')
    print('=' * 60)
    print()


# ============================================================
#  GAME SETUP MENUS
# ============================================================

def clear_screen():
    """Clear the terminal."""
    os.system('cls' if os.name == 'nt' else 'clear')


def choose_difficulty():
    """Ask the player to pick a difficulty level."""
    print()
    print('  SELECT DIFFICULTY:')
    print('  ' + '-' * 40)
    print('    1) Easy       - AI looks 1 move ahead,  40% mistakes')
    print('    2) Normal     - AI looks 3 moves ahead, 15% mistakes')
    print('    3) Hard       - AI looks 5 moves ahead, no mistakes')
    print('    4) Impossible - AI looks 7 moves ahead, no mistakes')
    print()

    while True:
        try:
            choice = int(input('  Enter 1-4: '))
            if choice in DIFFICULTIES:
                name = DIFFICULTIES[choice]['name']
                print(f'  >> Difficulty set to: {name}')
                return choice
        except ValueError:
            pass
        print('  Invalid choice. Enter 1, 2, 3, or 4.')


def choose_first_turn():
    """Ask who goes first: player, AI, or random."""
    print()
    print('  WHO GOES FIRST?')
    print('  ' + '-' * 40)
    print('    1) You go first')
    print('    2) AI goes first')
    print('    3) Random')
    print()

    while True:
        try:
            choice = int(input('  Enter 1-3: '))
            if choice == 1:
                print('  >> You go first!')
                return PLAYER
            elif choice == 2:
                print('  >> AI goes first!')
                return AI
            elif choice == 3:
                first = random.choice([PLAYER, AI])
                who = 'You go' if first == PLAYER else 'AI goes'
                print(f'  >> Random chose: {who} first!')
                return first
        except ValueError:
            pass
        print('  Invalid choice. Enter 1, 2, or 3.')


# ============================================================
#  MAIN GAME LOOP
# ============================================================

def play():
    """Run the game."""
    clear_screen()
    print('=' * 60)
    print('            CONNECT FOUR - Human vs AI')
    print('=' * 60)
    print(f"  You are '{PLAYER}',  AI is '{AI}'")

    # --- Pre-game setup ---
    difficulty = choose_difficulty()
    first_turn = choose_first_turn()

    board = create_board()
    game_over = False
    turn = first_turn

    print()
    print(f"  Enter a column number (0-{COLS - 1}) to play.")
    print_board(board)

    while not game_over:

        if turn == PLAYER:
            # --- Human Turn ---
            try:
                col = int(input(f"  Your move (column 0-{COLS - 1}): "))
            except ValueError:
                print("  Please enter a number.")
                continue

            if not is_valid_move(board, col):
                print("  Invalid move. Try again.")
                continue

            drop_piece(board, col, PLAYER)

            if check_winner(board, PLAYER):
                clear_screen()
                print_board(board)
                print('  * YOU WIN! Congratulations! *')
                print()
                game_over = True
            else:
                turn = AI

        else:
            # --- AI Turn ---
            print()
            print("  AI is thinking...")
            col, steps, tree = ai_move(board, difficulty)
            drop_piece(board, col, AI)

            clear_screen()
            print_board(board)
            print(f"  AI plays column {col}")

            # Show AI reasoning
            print_ai_reasoning(steps, tree)

            if check_winner(board, AI):
                print('  * AI WINS! *')
                print()
                game_over = True
            else:
                turn = PLAYER

        if not game_over:
            if is_board_full(board):
                clear_screen()
                print_board(board)
                print("  * IT'S A DRAW! *")
                print()
                game_over = True

    # Play again?
    again = input("  Play again? (y/n): ").strip().lower()
    if again == 'y':
        play()
    else:
        print("  Thanks for playing!")


if _name_ == '_main_':
    play()
