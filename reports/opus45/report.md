# Run opus45

Agent model `claude-opus-4-5`, prompt `tau2-default`, 114 tasks × 4 trials.

| Metric | Value |
|---|---|
| Trajectories passing | 363 / 456 (79.6%) |
| Tasks passing every trial | 59 / 114 |
| Flaky tasks | 52 |
| API cost of this run | $0.00 |

## Rule findings

Trajectories with at least one finding, split by outcome. Findings on passing trajectories are
policy problems the benchmark's outcome check does not see.

| Check | In failed | In passed |
|---|---|---|
| `auth-first` | 1 | 10 |
| `confirm-before-write` | 0 | 1 |
| `details-before-confirm` | 0 | 1 |
| `same-product` | 2 | 5 |
| `write-error` | 1 | 1 |
| `expected-writes` | 86 | 27 |

## Failure triage (deterministic)

| Bucket | Failed trajectories | Share | Usual category |
|---|---|---|---|
| `sim-stop-on-confirm` | 33 | 35.5% | benchmark_artifact |
| `ended-in-transfer` | 14 | 15.1% | mixed |
| `wrong-variant` | 12 | 12.9% | model |
| `missing-write` | 9 | 9.7% | mixed |
| `unwarranted-write` | 9 | 9.7% | model |
| `communication-only` | 7 | 7.5% | prompt |
| `wrong-cancel-reason` | 5 | 5.4% | benchmark_artifact |
| `wrong-payment-method` | 3 | 3.2% | model |
| `wrong-other-argument` | 1 | 1.1% | model |

## Tasks

| Task | Trials | Status | Checks with findings | Gate |
|---|---|---|---|---|
| 0 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 1 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 2 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 3 | ✓ ✓ ✓ ✓ | pass | auth-first×3 | ok |
| 4 | ✓ ✓ ✗ ✓ | flaky | auth-first×4 | ok |
| 5 | ✗ ✗ ✓ ✗ | flaky | - | ok |
| 6 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 7 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 8 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 9 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 10 | ✗ ✓ ✓ ✗ | flaky | - | ok |
| 11 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 12 | ✗ ✓ ✗ ✓ | flaky | - | ok |
| 13 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 14 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 15 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 16 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 17 | ✓ ✓ ✓ ✓ | pass | details-before-confirm×1 | ok |
| 18 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 19 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 20 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 21 | ✓ ✓ ✓ ✓ | pass | same-product×4 | ok |
| 22 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 23 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 24 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 25 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 26 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 27 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 28 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 29 | ✓ ✓ ✗ ✓ | flaky | same-product×1 | ok |
| 30 | ✓ ✓ ✓ ✗ | flaky | confirm-before-write×1 | ok |
| 31 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 32 | ✗ ✓ ✗ ✗ | flaky | - | ok |
| 33 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 34 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 35 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 36 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 37 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 38 | ✗ ✗ ✗ ✓ | flaky | - | ok |
| 39 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 40 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 41 | ✗ ✗ ✗ ✗ | fail | - | ok |
| 42 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 43 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 44 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 45 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 46 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 47 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 48 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 49 | ✗ ✗ ✓ ✗ | flaky | - | ok |
| 50 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 51 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 52 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 53 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 54 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 55 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 56 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 57 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 58 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 59 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 60 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 61 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 62 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 63 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 64 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 65 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 66 | ✗ ✓ ✗ ✗ | flaky | - | ok |
| 67 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 68 | ✗ ✓ ✗ ✗ | flaky | - | ok |
| 69 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 70 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 71 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 72 | ✗ ✗ ✓ ✓ | flaky | - | ok |
| 73 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 74 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 75 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 76 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 77 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 78 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 79 | ✗ ✗ ✓ ✗ | flaky | - | ok |
| 80 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 81 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 82 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 83 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 84 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 85 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 86 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 87 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 88 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 89 | ✓ ✓ ✓ ✓ | pass | auth-first×4 | ok |
| 90 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 91 | ✓ ✗ ✗ ✓ | flaky | - | ok |
| 92 | ✓ ✗ ✓ ✗ | flaky | - | ok |
| 93 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 94 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 95 | ✓ ✗ ✓ ✗ | flaky | - | ok |
| 96 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 97 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 98 | ✓ ✗ ✓ ✗ | flaky | - | ok |
| 99 | ✓ ✗ ✗ ✗ | flaky | - | ok |
| 100 | ✗ ✗ ✗ ✓ | flaky | - | ok |
| 101 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 102 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 103 | ✗ ✗ ✓ ✓ | flaky | - | ok |
| 104 | ✗ ✓ ✓ ✗ | flaky | - | ok |
| 105 | ✗ ✓ ✗ ✓ | flaky | write-error×2 | ok |
| 106 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 107 | ✗ ✗ ✗ ✗ | fail | - | ok |
| 108 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 109 | ✗ ✓ ✓ ✗ | flaky | - | ok |
| 110 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 111 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 112 | ✗ ✗ ✗ ✗ | fail | same-product×2 | ok |
| 113 | ✓ ✓ ✗ ✓ | flaky | - | ok |
