"""Fixtures: the reader's decks and games. Friends Colin, Peter, Max and Chris. Today is Oct 31, 2026."""
from ghlib import game, seat

COLIN = lambda won=False: seat('Colin', 'Dino Stampede', 'ghalta', won)
PETER = lambda won=False: seat('Peter', 'Rootha', 'rootha', won)
MAX = lambda won=False: seat('Max', 'Zimone', 'zimone', won)
CHRIS = lambda won=False: seat('Chris', 'Jace', 'jace', won)

OCT = [
    game('gishath', 'win', 4, 'Oct 30', 3, ('speed', 'board'), (), (COLIN(), PETER(), MAX())),
    game('goblins', 'loss', 4, 'Oct 30', 2, (), ('mana',), (COLIN(True), PETER(), MAX()), 'Mulled to 5. Never found a second Mountain.'),
    game('aang', 'win', 3, 'Oct 24', 1, ('engine', 'closing'), (), (PETER(), CHRIS())),
    game('aang', 'loss', 4, 'Oct 17', 1),
    game('elves', 'draw', 5, 'Oct 9', None, ('board',), ('interaction',), (COLIN(), seat('Peter', 'Gisa’s Graveyard', 'gisa'), MAX(), CHRIS())),
    game('gishath', 'loss', 4, 'Oct 2', 2, (), ('speed', 'closing'), (COLIN(True), PETER(), MAX())),
]
SEP = [
    game('scrappy', 'win', 4, 'Sep 26', 4, ('card_flow',), (), (COLIN(), MAX(), CHRIS())),
    game('aang', 'loss', 4, 'Sep 19', 1, (), ('mana',), (PETER(True), MAX(), CHRIS())),
    game('kratos', 'loss', 3, 'Sep 12', 2, (), (), (seat('Dana', 'Atraxa', 'giada', True), seat('Lee', 'Killian', 'killian'))),
]
