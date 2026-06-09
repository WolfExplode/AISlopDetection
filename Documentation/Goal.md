# Goal

Build a slop detector. A tool that parses a piece of AI-generated text and tells you how much AI slop it contains. 

The closest existing reference is **slop-cop**: a browser-based editor that highlights LLM rhetorical tells in real time as you type or paste text. This project follows the same model.

---

Slop is defined in @What Is Slop.md

---

## Design requirements

**Paste-and-score interface** The user pastes text. The tool scores it and shows what triggered. No account, no server calls, runs in the browser.

**2. Two separate scores, not one blended number**
- *Lexical score* — how many slop words and phrases the text contains per 1k words.
- *Rhetorical score* — how many Type 2 patterns the text triggers (sycophantic opening, roleplay, document theater, engagement bait, self-narration).
- An overall "Slop Score" can combine them, but both components are shown individually.

**Show your work** Every flagged signal is highlighted or listed with the matched text. The user should be able to see exactly what triggered each penalty — not just a number.

**Prompt input is optional** The detector must work on response text alone. If the user also provides the original prompt, additional signals become available (meta-echo, register mismatch). Prompt input is a secondary feature, not a requirement.

---

## Scope

### In scope

- Browser-based tool (single HTML file or small static app)
- Type 1 detection: slop word list, bigrams, trigrams (existing lists from eqbench scorer)
- Type 2 detection:
  - Sycophantic opening (gratitude + praise adjective in first 2 sentences)
  - Roleplay framing (presence-claiming phrases in opening)
  - Document theater (header/table/bold density)
  - Engagement bait (closing-window phrases)
  - Self-narration (first-person internal state phrases)
- Highlighted output showing matched text inline
- Per-signal breakdown alongside the score
- Optional prompt input unlocking meta-echo detection

### Out of scope

- Model leaderboard / benchmarking pipeline (that's eqbench scorer's job)
- Humanization / rewriting (that's slopbuster's job)
- File scanning or CI integration (that's slopsquid / slop-cop-CLI's job)
- Fine-tuned ML models
- Sycophancy scoring beyond textual patterns (that's sycofact's job)

---

## Relationship to existing tools

| Tool | What it does | Overlap with this project |
|------|-------------|--------------------------|
| eqbench Slop Score | Leaderboard + Type 1 scorer | Shares word lists; this project adds Type 2 and a better interface |
| slop-cop | Real-time editor with 36 instant rules | **Closest reference** — same instant client-side model, this project focuses on scoring and explanation rather than editing |
| slopsquid | CLI file/site scanner | Different interface; similar rule set |
| slopbuster | Humanization agent skill | Downstream of this — detect first, fix second |

---

## Success condition

Given the clinical benchmark inputs, the detector must:
1. Flag the sloppy response's opening (sycophantic praise + roleplay framing)
2. Flag its document theater (3 headers, 5-row table)
3. Flag its engagement bait closing
4. Give the sloppy response a higher overall Slop Score than the not-sloppy response
5. Show the user exactly which sentences and phrases triggered each flag
