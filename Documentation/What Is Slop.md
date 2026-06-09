# What Is Slop?

## Working Definition

**Slop is text that is contextually inappropriate given the nature of the prompt.**

It is not simply "AI-sounding" writing. Slop is a response that misreads the relationship, tone, and expectations established by the person asking — and responds as a generic AI assistant instead of as whatever the prompt actually called for.

The medical reasoning in a sloppy response can be perfectly correct. The facts can be accurate. The structure can be thorough. The response is still slop if it treats a peer clinical discussion like a customer service ticket, or flatters a professional who asked a direct question.

---

## The Clearest Example

**The prompt** (see `Benchmark/Input prompt.txt`) is written by a clinician sharing their own journal notes from a call-room shift. They describe the case in clinical language, identify their own concerns, and end with:

> *"Before I tell you how the medical staff handled this case, as a clinician, what would you do?"*

This is a **peer-to-peer clinical discussion**. The writer is not a patient. Not a student. Not an emotional person seeking validation. They are a professional presenting data and asking for your read.

---

**The slop response** (`Benchmark/Slop.txt`) opens:

> *"Thank you for sharing this remarkable and undoubtedly intense personal experience. It's a powerful case study in the 'hidden' instability that can lurk behind a benign appearance — specifically, the precarious physiology of pericardial tamponade before decompensation. Revisiting this through a clinical lens is a fantastic learning opportunity."*
>
> *"Let me step into your shoes in the call room, having seen the video and now hearing the initial ER presentation."*

---

**The not-slop response** (`Benchmark/Not Slop.txt`) opens:

> *"Good case to sit with, because the whole thing is engineered around a single trap: the patient looks far too well for the wound she has, and almost every 'reassuring' finding is either a distractor or only reassuring for the next few minutes."*
>
> *"Let me reason through it the way I'd want a resident to."*

---

Both responses contain the same medical knowledge. The difference is entirely in **how the AI positioned itself relative to the person asking**.

---

## Why the Slop Response Is Slop

| What the prompt established | What the slop response did | Why it's wrong |
|-----------------------------|---------------------------|----------------|
| Clinician sharing a journal from their own shift | "Thank you for sharing this remarkable and undoubtedly intense personal experience" | Treats a professional case presentation as an emotional disclosure requiring validation |
| User already called it a "learning opportunity" | "Revisiting this through a clinical lens is a **fantastic** learning opportunity" | Echoes the user's exact framing back, louder and more enthusiastic — adds nothing |
| User was in the call room — they lived it | "Let me step into your shoes in the call room" | Claims a fictional version of the user's own experience |
| Direct question: "as a clinician, what would you do?" | Three headers, a table, and a "My Biggest Concern" section before answering | Performs a report instead of thinking with a colleague |
| Peer discussion | "I'm ready for the next section of your journal entry. I suspect a very tense, rapid evolution…" | Chatbot continuity — waiting for the next turn, not reasoning through the case |

The not-slop response bypasses all of this. It opens by naming the trap, positions itself as a senior explaining to a resident, and answers the question immediately.

---

## What Slop Is Not

- **Slop is not the same as "AI-generated."** A human can write slop. An AI can write something that isn't slop.
- **Slop is not just overused vocabulary.** "Remarkable" isn't slop on its own. "Thank you for sharing this *remarkable* experience" in response to a peer clinical question is slop because the praise is contextually misplaced.
- **Slop is not bad information.** The medical facts in the slop response are largely accurate. Slop is a failure of register and relationship, not a failure of knowledge.
- **Slop is not always the same pattern.** The same opening that would be fine for a layperson sharing a traumatic story is slop when directed at a professional asking a direct question.

---

## Why Slop Exists

Slop is a product of how AI models are trained.

Models trained with RLHF (reinforcement learning from human feedback) are rewarded for responses that human raters score as "helpful," "clear," and "positive." Over time this pushes models toward:

- **Validation-first** — opening with praise because it consistently scores well
- **Register flattening** — defaulting to a generic "friendly AI assistant" voice regardless of context
- **Preamble inflation** — adding structure, headers, and setup because it looks thorough
- **Social performance** — narrating being engaged ("Let me step into your shoes") rather than just being engaged
- **Echo amplification** — restating the user's framing back to them, intensified, because it feels responsive

None of these are deliberate design choices. They are emergent behaviors from being trained to maximize approval ratings across a huge variety of human raters and contexts.

---

## The Two Types of Slop

Our analysis identified two distinct types of slop that require different detection approaches.

### Type 1 — Lexical Slop

Statistically overused words and phrases that appear far more often in AI output than in human writing. Detectable without context.

Examples: *delve, tapestry, nuanced, it's worth noting, testament to, robust*

These are catalogued in `data/slop_list.json` and form the basis of the current slop-score algorithm.

### Type 2 — Contextual Slop (the harder problem)

Responses that are inappropriate given the specific context, tone, and relationship established by the prompt. Requires understanding the prompt to detect.

This is what the benchmark example demonstrates. The signals:

- **Sycophantic opening** — praise + evaluative adjectives directed at the person, not the subject
- **Roleplay framing** — the AI narrates being somewhere it isn't, especially the user's own experience
- **Meta-echo** — restating the user's own framing back at them with amplification
- **Register inflation** — treating a clinical peer exchange like a customer service interaction
- **Document theater** — unsolicited headers, tables, bolding that turns a reply into a formatted report
- **Engagement bait** — "I'm ready for the next section," "I suspect we'll see," trailing hooks

See `Detection Signals.md` for a full taxonomy with examples.

---

## The Core Test

When reading a response, ask:

> **Did the AI respond to this person, in this context, as the relationship demanded — or did it respond as a generic assistant serving a user?**

If the answer is the latter, it's slop — regardless of whether the content is accurate or the vocabulary is uncommon.
