# Independent rating packet: does this cell show the character?

You are checking a rendering detector by eye. You do not need to know Unicode. It takes about 45 to 60 minutes for 274 cells.

**Do not look at any detector output, other raters' labels or the study's own labels before you finish.** The sheets show only a sample id (red), the code point or sequence name (grey) and the rendered cell.

## What you see

`sheets/sheet_cp_*.png`: single characters (rendered at 48 px, black on white). `sheets/sheet_seq_*.png`: emoji sequences. Each cell has its sample id in red in the top-left corner.

## Labels for single characters (`kind = cp`)

| Label | Meaning |
|---|---|
| `G` | a real glyph is drawn (any shape that is not a placeholder, including a symbol you do not recognise) |
| `T` | a "tofu" placeholder: an empty rectangle, a rectangle with a cross or question mark, or a box with the words "NO GLYPH" |
| `H` | a placeholder box with tiny hexadecimal digits inside |
| `B` | nothing visible |

## Labels for emoji sequences (`kind = seq`)

The grey text names the emoji. Judge only whether the cell shows **one** emoji picture for the whole name.

| Label | Meaning |
|---|---|
| `FULL` | one colour picture of the whole thing (a flag, a person with a skin tone, a couple, and so on) |
| `DEC` | the parts are shown side by side instead of one picture (for example two people and a heart in a row, or a flag shown as two letters) |
| `PART` | some parts are shown and at least one part is a placeholder box or is missing |
| `MISS` | placeholder box(es) only, or nothing |
| `TEXT` | one monochrome (black) symbol where a colour picture belongs |

If you cannot decide, pick your best guess and set `unsure_flag` to `1`.

## Returning your labels

Fill `labels_template.csv` (keep the sample ids), save it as `labels_<yourname-or-initials>.csv`, and email it to hello@ultratextgen.com with the subject "Rendering study rater". Say whether you want to be credited by name. Label files are published with the next version of the study.

Please also tell us the device, operating system and screen you used to look at the sheets (this matters for how boxes look).
