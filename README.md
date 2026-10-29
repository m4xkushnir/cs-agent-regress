# cs-agent-regress

A deterministic regression harness for LLM customer-service agents, and a failure analysis of
1,368 public conversations from the [τ-bench](https://github.com/sierra-research/tau2-bench)
retail domain (returns, exchanges, cancellations, order changes).

It answers three questions you face when an agent misbehaves in production:

1. **What actually went wrong?** Rule checks taken from the written policy, plus a triage that
   puts every failed conversation into one bucket.
2. **Is it the agent or the measurement?** About a third of the failures in this data are the
   evaluation's fault, not the agent's.
3. **Did my fix work without breaking something else?** Same inputs plus the same cache give a
   byte-identical report, and `compare` exits non-zero on a regression, so it runs in CI.

Everything below was measured on the committed data. Numbers are counts of conversations
("trajectories"), not samples.

## Data

Published leaderboard runs by τ-bench's authors: each model did all 114 retail tasks 4 times,
with a GPT-5.2 simulated customer (τ-bench 1.0.1). Recomputed pass rates match the leaderboard
to the hundredth.

| | Claude Sonnet 4.5 | Claude Opus 4.5 | GPT-5.2 |
|---|---|---|---|
| Trajectories passing | 330 / 456 (72.4%) | 363 / 456 (79.6%) | 372 / 456 (81.6%) |
| Tasks passing every trial | 45 / 114 | 59 / 114 | 59 / 114 |
| Failed trajectories | 126 | 93 | 84 |

## Findings

### 1. A third of the failures are the simulated customer hanging up too early

In 99 of 303 failures (32.7%), the simulated customer says "Yes, please proceed" and ends the
chat **in the same message**. The agent never gets a turn to make the change, and the run is scored
as a failure. The cause is one line in the simulator's guidelines: *"If the instruction goal is
satisfied, generate the '###STOP###' token"*. The simulator treats its own "yes" as the goal being met.

| | Sonnet 4.5 | Opus 4.5 | GPT-5.2 |
|---|---|---|---|
| Failures from confirm-and-hang-up | 47 (37.3%) | 33 (35.5%) | 19 (22.6%) |
| Pass rate if all of them would have passed (upper bound) | 82.7% | 86.8% | 85.7% |

The upper bound is not a claim that the agent would have finished correctly; it shows that the
2.0-point gap between Opus 4.5 and GPT-5.2 is smaller than this artifact. `runner/run.py
--sim-fix` rewrites the rule so the simulator waits for the agent to report completion.

### 2. GPT-5.2 sends raw JSON to customers in 92% of conversations

1,410 of GPT-5.2's 2,293 customer-facing messages (61.5%) are a JSON object such as
`{ "message": "Found it — the correct order is #W9502127 ..." }`, in 420 of 456 conversations.
The Claude models never do this under the same prompt. The outcome check does not see it, because
it only scores the database and required facts. The likely trigger is the stock agent prompt line
*"Always make sure you generate valid JSON only"*. That is a hypothesis: I could not rerun GPT-5.2.

### 3. Sonnet 4.5 accepts a username as proof of identity

Policy: authenticate by email or by name + ZIP, *"even when the user already provides the user
id"*. In 7 Sonnet 4.5 trajectories (zero for Opus 4.5 and GPT-5.2) the agent looked the customer
up directly by the user ID they typed and declared them verified (`"Great! I've authenticated your
account."`, `sonnet45/056/t3`). In 5 of those it then changed an order or the account address. The
outcome check passed 3 of the 5. For a real merchant this is the account-takeover path: anyone who
knows a username can modify orders. `auth-first` flags it as critical.

### 4. Exchanges that swap an item for itself

The policy allows an exchange only to *a different option* of the same product. In 16
trajectories across all three models (Sonnet 8, Opus 4, GPT-5.2 4), the agent exchanged an item
for the identical item ID. The backend accepts it, so 4 of those 16 still passed. The check
compares IDs, so it has no false positives.

### 5. Attempted refunds to the wrong payment method

In 7 Sonnet 4.5 trajectories the agent tried to refund a gift-card-paid order to a credit card
because the customer asked. Policy forbids this. τ-bench's backend rejected every attempt
(`Payment method should be the original payment method`), and 6 of the 7 still passed.
On a merchant backend without that guard, the refund would have gone through.

### 6. Wrong replacement item: whose mistake depends on the model

44 failures picked a different replacement variant than expected. For GPT-5.2, 18 of 20 used an
item ID **the simulated customer named itself**. GPT-5.2 lists IDs and the simulator picks the
wrong one, sometimes against its own instructions (task 0: told "no backlight" as the fallback,
it chose "white backlight"). For Sonnet and Opus, 16 of 24 were chosen by the agent. Part of this
bucket is a simulator problem, and the share depends on how the agent presents options.

### What turned out to be rare

Skipping confirmation before a write is rare: 2 confirmed cases in 1,368 conversations after
auditing the check (see Limitations). Apart from finding 3, the `auth-first` findings are
catalog lookups before login: all 11 for Opus 4.5 and 1 for Sonnet 4.5. That breaks the letter of
the policy, but the catalog needs no account.

### Failure triage across models

| Bucket | Usual category | Sonnet 4.5 | Opus 4.5 | GPT-5.2 |
|---|---|---|---|---|
| `sim-stop-on-confirm` | benchmark artifact | 47 (37.3%) | 33 (35.5%) | 19 (22.6%) |
| `ended-in-transfer` | mixed | 28 (22.2%) | 14 (15.1%) | 13 (15.5%) |
| `wrong-variant` | model / simulator | 12 (9.5%) | 12 (12.9%) | 20 (23.8%) |
| `missing-write` | mixed | 15 (11.9%) | 9 (9.7%) | 6 (7.1%) |
| `wrong-cancel-reason` | benchmark artifact | 9 (7.1%) | 5 (5.4%) | 8 (9.5%) |
| `communication-only` | prompt | 8 (6.3%) | 7 (7.5%) | 3 (3.6%) |
| `unwarranted-write` | model | 3 (2.4%) | 9 (9.7%) | 6 (7.1%) |
| `wrong-payment-method` | model | 3 (2.4%) | 3 (3.2%) | 6 (7.1%) |
| `wrong-other-argument` | model | 1 (0.8%) | 1 (1.1%) | 3 (3.6%) |

`ended-in-transfer` is 50 of 55 customer-requested, mostly after identity-verification dead ends.
In task 5, for example, the simulator gives a "username" `mei_kovacs_8020` and refuses to give a
name, while the expected solution looks the user up as Mei Kovacs. `wrong-cancel-reason` includes
task 66, where the simulated customer explicitly asks for "ordered by mistake" and the task expects
"no longer needed". The full per-model tables are in [`reports/summary.md`](reports/summary.md).

## How it works

```
tau2 results ──ingest──▶ run.json.gz ──check──▶ report.json / report.md ──compare──▶ exit 0 | 1
 (Python runner,          (normalized,          (rule findings, triage,      (baseline vs
  cached calls)            sorted, gzip)         optional cached judge)       candidate)
```

- **`runner/`** (Python, uv): runs τ-bench 2.0.0 retail with every model call cached by
  `(model, prompt version, input hash, trial)`. The prompt version is the hash of the system
  message, so it can't drift from what was actually sent. A cost ledger prices each real call
  and refuses new calls near the `--budget-usd` cap.
- **`harness/`** (TypeScript, Node 22+): `ingest`, `ingest-results`, `check`, `compare`,
  `summary`, `scenarios`.
  - 13 policy rules: `auth-first`, `confirm-before-write`, `details-before-confirm`,
    `status-before-write`, `once-per-order`, `grounded-ids`, `same-user`, `refund-destination`,
    `same-product`, `different-option`, `cancel-reason`, `transfer-protocol`, `customer-format`,
    plus `write-error`.
  - An expected-write diff, and the triage buckets above.
  - An optional LLM judge (`--judge`) that labels failures as prompt / knowledge base / config /
    model / integration / benchmark artifact. Verdicts are cached by model, judge prompt version,
    trajectory and findings. `--offline` turns a cache miss into exit 3. The judge checks that its
    quoted evidence appears verbatim in the conversation.
- **`scenarios/`**: one YAML per test task, with the checks that must stay clean (`gate`) and any
  skipped with a reason.

Exit codes: `0` pass, `1` regression or gate violation, `2` bad input, `3` judge cache miss
offline.

`compare` counts a task as regressed only if it passed every baseline trial and failed every
candidate trial. Mixed results are reported as flaky and don't fail the build, because with a few
trials a single flip is as likely to be noise as a real change.

## Running it

```bash
cd harness && npm ci && npm run build && cd ..
./scripts/fetch-public.sh                      # download + normalize the three public runs
node harness/dist/cli.js check data/runs/gpt52/run.json.gz --scenarios scenarios --out-dir reports/gpt52
node harness/dist/cli.js compare reports/opus45/report.json reports/gpt52/report.json --gate customer-format --out-dir /tmp/cmp
echo $?                                        # 1: gpt-5.2 fails the customer-format gate
```

Running the benchmark yourself needs `ANTHROPIC_API_KEY` in `.env` (see `.env.example`):

```bash
git clone --depth 1 --branch v2.0.0 https://github.com/sierra-research/tau2-bench vendor/tau2-bench
cd runner && uv sync && cd ..
uv run --project runner python runner/run.py --run-id haiku-v1 --agent-model claude-haiku-5-5 --trials 2 --budget-usd 40
```

CI ([`.github/workflows/regression.yml`](.github/workflows/regression.yml)) runs the tests,
rebuilds every report from the committed runs, fails if any report differs from the committed
copy, and checks that a failing gate really exits 1.

## Before/after loop

Not run yet: it needs API spend, and I haven't had a key. The prepared loop, on Claude Haiku 5.5
over the 40-task test split with 2 trials each (~$25 estimated, capped at $40):

1. `haiku-v1`: stock simulator, stock prompt (baseline).
2. `haiku-v1-simfix`: `--sim-fix` (config change). Expect `sim-stop-on-confirm` to drop and no
   task to regress.
3. `haiku-v2-simfix`: `--prompt agent_v2` adds one policy sentence about identical-item
   exchanges. Gate `different-option` and `confirm-before-write` with `compare`.

Results will be added here only after they are measured.

## Limitations

- **Simulated customers, not real ones.** Every conversation is with an LLM playing a customer,
  and several findings are about that simulator. Real traffic will have a different mix.
- **The rules are heuristics, audited by hand on samples.**
  - `confirm-before-write` went through three rounds of false-positive fixes (a reason like "no
    longer needed" read as a refusal, a yes followed by a clarifying question). It now favours
    precision and misses some borderline cases where the customer gave the details instead of
    saying yes.
  - `same-product` only knows `get_product_details`, so a model that checks variants with
    `get_item_details` gets a minor "not fetched" finding it doesn't deserve.
- **The expected-write diff compares against one reference solution.** τ-bench scores the
  database end state, and other paths can be correct, so buckets explain failures rather than
  define them.
- **Root causes come from reading a handful of conversations per bucket.** The counts are exact;
  the explanations behind them are hypotheses with the evidence quoted. The invented "one order
  per conversation" rule (Sonnet, task 92) appeared once, which is too thin to call a pattern.
- **Version mismatch.** The public runs used τ-bench 1.0.1. The runner targets 2.0.0. The expected
  actions and customer instructions are identical for all 114 retail tasks in both versions. For its own runs the runner uses substring
  matching for required statements, and Sonnet 5.5 instead of τ-bench's pinned OpenAI judge for
  the 11 test tasks with natural-language assertions.
- **No model was rerun.** Findings about prompt sensitivity (the JSON finding) are untested
  hypotheses until the loop above runs.

## License

MIT. τ-bench is MIT-licensed by Sierra Research; this repo includes normalized derivatives of
its published trajectories.
