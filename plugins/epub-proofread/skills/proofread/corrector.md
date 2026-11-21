# Brief for a chunk proofreader

You get one chunk file and the glossary. Read the whole glossary first. For every block in the chunk, write the corrected translation to the output file.

## Input

```
@@ <id>
EN: <source text>
KO: <first-pass translation>
```

`EN` and `KO` are only labels: source and translation, whatever the languages are.

## What to do

- Fix mistranslations, omissions, additions, reversed meanings, and errors in numbers, years and names.
- Use the glossary's terms, spellings and register exactly. Translate the same source term the same way every time.
- Follow the target language's conventions as the glossary's principles state them. For Korean the defaults are: plain written style (한다체) for body text, 『』 for book titles, 「」 for article and chapter titles.
- Leave bibliographic details (author, original title, publisher, pages) in the original language.
- Keep section numbers ("1", "(2)") where the source has them.
- If a sentence is already correct and natural, leave it. Don't over-polish.
- If EN is empty, just polish the translation.

## Markup rules (checked by script; a block that breaks them is thrown away)

- Every `⟦1⟧`, `⟦2⟧`… in KO appears in your output exactly once, unchanged.
- A footnote link in EN such as `⟦L3:12⟧` appears in your output as `⟦L3⟧`, once, where that note belongs in the translated sentence.
- The only tags allowed are `<i> <b> <em> <strong>`, and they must pair up. If EN has `<i>`/`<b>` the translation lacks, add them around the matching words.
- One block is one line.
- Write `=SRC` alone only when the translation element must go entirely (it duplicates the source verbatim).

## Output

```
@@ <id>
<corrected translation>

```

Write every id from the input, in the same order. When done, check that the number of `@@` lines equals the input's.
Report the block count and 3–6 notable changes or judgment calls, with their ids.
