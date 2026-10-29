# Run sonnet45

Agent model `claude-sonnet-4-5`, prompt `tau2-default`, 114 tasks × 4 trials.

| Metric | Value |
|---|---|
| Trajectories passing | 330 / 456 (72.4%) |
| Tasks passing every trial | 45 / 114 |
| Flaky tasks | 63 |
| API cost of this run | $0.00 |

## Rule findings

Trajectories with at least one finding, split by outcome. Findings on passing trajectories are
policy problems the benchmark's outcome check does not see.

| Check | In failed | In passed |
|---|---|---|
| `auth-first` | 4 | 4 |
| `once-per-order` | 1 | 4 |
| `refund-destination` | 1 | 6 |
| `same-product` | 1 | 11 |
| `different-option` | 5 | 3 |
| `write-error` | 3 | 11 |
| `expected-writes` | 118 | 28 |

## Failure triage (deterministic)

| Bucket | Failed trajectories | Share | Usual category |
|---|---|---|---|
| `sim-stop-on-confirm` | 47 | 37.3% | benchmark_artifact |
| `ended-in-transfer` | 28 | 22.2% | mixed |
| `missing-write` | 15 | 11.9% | mixed |
| `wrong-variant` | 12 | 9.5% | model |
| `wrong-cancel-reason` | 9 | 7.1% | benchmark_artifact |
| `communication-only` | 8 | 6.3% | prompt |
| `unwarranted-write` | 3 | 2.4% | model |
| `wrong-payment-method` | 3 | 2.4% | model |
| `wrong-other-argument` | 1 | 0.8% | model |

## Tasks

| Task | Trials | Status | Checks with findings | Gate |
|---|---|---|---|---|
| 0 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 1 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 2 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 3 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 4 | ✗ ✗ ✓ ✗ | flaky | - | ok |
| 5 | ✗ ✗ ✗ ✗ | fail | auth-first×1 | ok |
| 6 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 7 | ✓ ✓ ✗ ✗ | flaky | - | ok |
| 8 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 9 | ✗ ✓ ✓ ✗ | flaky | auth-first×1 | ok |
| 10 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 11 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 12 | ✓ ✓ ✓ ✓ | pass | refund-destination×2, write-error×2 | ok |
| 13 | ✓ ✓ ✓ ✓ | pass | refund-destination×1, write-error×1 | ok |
| 14 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 15 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 16 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 17 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 18 | ✗ ✗ ✗ ✗ | fail | different-option×3 | ok |
| 19 | ✗ ✗ ✓ ✗ | flaky | write-error×1 | ok |
| 20 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 21 | ✓ ✓ ✓ ✗ | flaky | same-product×3 | ok |
| 22 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 23 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 24 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 25 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 26 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 27 | ✓ ✓ ✓ ✗ | flaky | different-option×1, once-per-order×1, write-error×1 | ok |
| 28 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 29 | ✓ ✗ ✓ ✗ | flaky | same-product×1 | ok |
| 30 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 31 | ✗ ✗ ✗ ✗ | fail | - | ok |
| 32 | ✓ ✓ ✗ ✗ | flaky | - | ok |
| 33 | ✓ ✓ ✓ ✓ | pass | same-product×1, write-error×1 | ok |
| 34 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 35 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 36 | ✗ ✓ ✓ ✓ | flaky | different-option×1, once-per-order×1, write-error×1 | ok |
| 37 | ✓ ✗ ✓ ✓ | flaky | different-option×2, once-per-order×3, same-product×1, write-error×3 | ok |
| 38 | ✗ ✗ ✗ ✗ | fail | - | ok |
| 39 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 40 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 41 | ✗ ✗ ✗ ✗ | fail | auth-first×3 | ok |
| 42 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 43 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 44 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 45 | ✓ ✓ ✗ ✗ | flaky | same-product×1 | ok |
| 46 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 47 | ✓ ✗ ✗ ✓ | flaky | - | ok |
| 48 | ✓ ✓ ✓ ✓ | pass | auth-first×1 | ok |
| 49 | ✓ ✓ ✓ ✗ | flaky | same-product×3 | ok |
| 50 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 51 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 52 | ✗ ✓ ✓ ✗ | flaky | - | ok |
| 53 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 54 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 55 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 56 | ✗ ✓ ✓ ✓ | flaky | auth-first×1 | ok |
| 57 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 58 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 59 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 60 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 61 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 62 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 63 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 64 | ✗ ✓ ✓ ✓ | flaky | - | ok |
| 65 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 66 | ✓ ✗ ✗ ✗ | flaky | - | ok |
| 67 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 68 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 69 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 70 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 71 | ✓ ✓ ✗ ✗ | flaky | - | ok |
| 72 | ✓ ✗ ✗ ✗ | flaky | - | ok |
| 73 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 74 | ✗ ✗ ✗ ✓ | flaky | - | ok |
| 75 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 76 | ✗ ✗ ✗ ✗ | fail | - | ok |
| 77 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 78 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 79 | ✗ ✗ ✓ ✗ | flaky | - | ok |
| 80 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 81 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 82 | ✓ ✓ ✓ ✓ | pass | refund-destination×1, write-error×1 | ok |
| 83 | ✓ ✓ ✗ ✓ | flaky | refund-destination×2, write-error×2 | ok |
| 84 | ✓ ✗ ✓ ✓ | flaky | - | ok |
| 85 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 86 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 87 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 88 | ✗ ✗ ✗ ✓ | flaky | - | ok |
| 89 | ✓ ✓ ✓ ✓ | pass | auth-first×1 | ok |
| 90 | ✗ ✗ ✓ ✗ | flaky | - | ok |
| 91 | ✓ ✗ ✗ ✗ | flaky | - | ok |
| 92 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 93 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 94 | ✓ ✓ ✓ ✗ | flaky | - | ok |
| 95 | ✗ ✓ ✗ ✗ | flaky | - | ok |
| 96 | ✓ ✓ ✗ ✗ | flaky | - | ok |
| 97 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 98 | ✓ ✗ ✗ ✓ | flaky | - | ok |
| 99 | ✗ ✓ ✗ ✗ | flaky | - | ok |
| 100 | ✗ ✓ ✓ ✓ | flaky | refund-destination×1, write-error×1 | ok |
| 101 | ✓ ✓ ✗ ✗ | flaky | - | ok |
| 102 | ✗ ✓ ✗ ✓ | flaky | - | ok |
| 103 | ✓ ✗ ✗ ✓ | flaky | - | ok |
| 104 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 105 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 106 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 107 | ✗ ✓ ✗ ✗ | flaky | different-option×1 | ok |
| 108 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 109 | ✓ ✗ ✗ ✓ | flaky | - | ok |
| 110 | ✓ ✓ ✗ ✓ | flaky | - | ok |
| 111 | ✓ ✓ ✓ ✓ | pass | - | ok |
| 112 | ✗ ✓ ✓ ✗ | flaky | same-product×2 | ok |
| 113 | ✓ ✓ ✓ ✓ | pass | - | ok |
