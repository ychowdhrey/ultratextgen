# Pinterest Opportunity Boards for Football, Countries and Player Pages

PR #372 leaves UltraTextGen with a large Pinterest-ready page set, but many of
the new pages still sit inside broad boards such as `Emoji Copy Paste & Emoji
Combos`. This plan splits the highest-volume visual clusters into focused boards
that can each act like a Pinterest search surface.

The images are not regenerated here. The script reuses the existing 1000×1500
PNG pins already listed in `data/pinterest_pins.csv` and writes new importer CSVs
with focused board names and focused UTM campaigns.

## Board set

| Board group | Pinterest board name | Pins | Upload CSV |
|---|---|---:|---|
| `country_flags` | `Country Emoji Combos & Flags` | 57 | `data/country_flags_pinterest_upload.csv` |
| `football_players` | `Football Player Emoji Combos` | 31 | `data/football_players_pinterest_upload.csv` |
| `world_cup_football` | `World Cup & Football Emoji Combos` | 12 | `data/world_cup_football_pinterest_upload.csv` |
| `soccer_text_art` | `Football Symbols & Soccer Text Art` | 4 | `data/soccer_text_art_pinterest_upload.csv` |
| **Total** |  | **104** |  |

## Why these boards

Pinterest rewards focused boards because the board title, pin title, description
and link destination all reinforce the same search intent. These four groups keep
highly visual football and country pages from being diluted inside one generic
emoji board.

### Country Emoji Combos & Flags

Covers country emoji combo pages such as Argentina, Brazil, England, France,
Germany, India, Italy, Japan, Mexico, Portugal, Spain, USA and the wider country
set. This is the most scalable board because every country page is evergreen and
can get fresh pin variants around flags, fan captions, travel posts, match days
and national-pride content.

### Football Player Emoji Combos

Covers player-led pages such as Messi, Ronaldo, Mbappe, Neymar, Haaland,
Bellingham, Salah, Son, Yamal, Vinicius, Saka and other player clusters. The
intent is very Pinterest-friendly because fans search and save player-specific
edits, bios, captions and emoji combinations.

### World Cup & Football Emoji Combos

Covers the broader football search set: World Cup emoji combos, soccer emoji
copy-paste, football reaction emojis, football trophy emoji, goal combos, GOAT
combos, yellow/red card emoji and guessing-game pages. This board is best for
seasonal bursts around tournaments, fixtures, finals and viral match moments.

### Football Symbols & Soccer Text Art

Covers football ASCII art, football kaomoji, football symbols and football
username ideas. Keep it separate from emoji boards because the visual intent is
more about copy-paste text art, handles and profile styling.

## Generate the focused upload CSVs

```bash
python3 scripts/build-pinterest-opportunity-boards.py
```

To build only one board:

```bash
python3 scripts/build-pinterest-opportunity-boards.py country_flags
```

To upload before the live site deploys the media files, point the media URLs at
the public GitHub branch mirror:

```bash
PIN_MEDIA_DOMAIN="https://raw.githubusercontent.com/ychowdhrey/ultratextgen/main" \
  python3 scripts/build-pinterest-opportunity-boards.py
```

The script writes Pinterest-importer-ready CSVs using the exact schema from
`scripts/pinterest_csv.py`. Create the Pinterest boards first, then upload the
matching CSV.

## Posting approach

Start with `World Cup & Football Emoji Combos` and `Football Player Emoji Combos`
while football demand is active. Post 3 to 5 pins per board per week instead of
bulk-uploading everything in one day. Country boards can run continuously, with
fresh batches around national holidays, football matches and travel moments.

For winners, make visual variants by rerunning the base pin generator after
adding new creative rows, but keep the same destination page and change only the
UTM content or campaign label so performance stays readable.
