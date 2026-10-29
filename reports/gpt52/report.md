# Run gpt52

Agent model `gpt-5.2`, prompt `tau2-default`, 114 tasks × 4 trials.

| Metric | Value |
|---|---|
| Trajectories passing | 372 / 456 (81.6%) |
| Tasks passing every trial | 59 / 114 |
| Flaky tasks | 51 |
| API cost of this run | $0.00 |

## Rule findings

Trajectories with at least one finding, split by outcome. Findings on passing trajectories are
policy problems the benchmark's outcome check does not see.

| Check | In failed | In passed |
|---|---|---|
| `confirm-before-write` | 0 | 1 |
| `once-per-order` | 2 | 1 |
| `same-product` | 5 | 7 |
| `different-option` | 3 | 1 |
| `customer-format` | 80 | 340 |
| `write-error` | 2 | 3 |
| `expected-writes` | 81 | 20 |

## Failure triage (deterministic)

| Bucket | Failed trajectories | Share | Usual category |
|---|---|---|---|
| `wrong-variant` | 20 | 23.8% | model |
| `sim-stop-on-confirm` | 19 | 22.6% | benchmark_artifact |
| `ended-in-transfer` | 13 | 15.5% | mixed |
| `wrong-cancel-reason` | 8 | 9.5% | benchmark_artifact |
| `missing-write` | 6 | 7.1% | mixed |
| `unwarranted-write` | 6 | 7.1% | model |
| `wrong-payment-method` | 6 | 7.1% | model |
| `communication-only` | 3 | 3.6% | prompt |
| `wrong-other-argument` | 3 | 3.6% | model |

## Tasks

| Task | Trials | Status | Checks with findings | Gate |
|---|---|---|---|---|
| 0 | ✗ ✗ ✗ ✗ | fail | customer-format×4 | ok |
| 1 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 2 | ✓ ✓ ✗ ✓ | flaky | customer-format×4 | ok |
| 3 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 4 | ✗ ✓ ✓ ✓ | flaky | customer-format×4 | ok |
| 5 | ✗ ✓ ✗ ✗ | flaky | customer-format×4 | ok |
| 6 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 7 | ✓ ✗ ✓ ✓ | flaky | customer-format×4 | ok |
| 8 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 9 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 10 | ✓ ✓ ✓ ✓ | pass | customer-format×2 | ok |
| 11 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 12 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 13 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 14 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 15 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 16 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 17 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 18 | ✓ ✓ ✗ ✓ | flaky | customer-format×4 | ok |
| 19 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 20 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 21 | ✓ ✗ ✓ ✓ | flaky | customer-format×4, same-product×3 | ok |
| 22 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 23 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 24 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 25 | ✓ ✓ ✓ ✓ | pass | customer-format×2 | ok |
| 26 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 27 | ✓ ✗ ✓ ✗ | flaky | customer-format×3 | ok |
| 28 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 29 | ✓ ✓ ✓ ✓ | pass | customer-format×4, same-product×1 | ok |
| 30 | ✓ ✓ ✓ ✓ | pass | confirm-before-write×1, customer-format×4 | ok |
| 31 | ✓ ✗ ✗ ✓ | flaky | customer-format×4 | ok |
| 32 | ✓ ✗ ✗ ✓ | flaky | customer-format×4 | ok |
| 33 | ✓ ✓ ✗ ✓ | flaky | customer-format×3 | ok |
| 34 | ✓ ✗ ✓ ✓ | flaky | customer-format×3 | ok |
| 35 | ✓ ✓ ✗ ✓ | flaky | customer-format×4 | ok |
| 36 | ✓ ✗ ✓ ✓ | flaky | customer-format×4, different-option×1, once-per-order×1, write-error×1 | ok |
| 37 | ✓ ✓ ✗ ✗ | flaky | customer-format×4, different-option×1, once-per-order×1, write-error×1 | ok |
| 38 | ✗ ✗ ✗ ✗ | fail | customer-format×4 | ok |
| 39 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 40 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 41 | ✓ ✗ ✓ ✗ | flaky | customer-format×3 | ok |
| 42 | ✓ ✗ ✓ ✓ | flaky | customer-format×4 | ok |
| 43 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 44 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 45 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 46 | ✗ ✓ ✓ ✓ | flaky | customer-format×3 | ok |
| 47 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 48 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 49 | ✓ ✓ ✓ ✓ | pass | customer-format×4, same-product×4 | ok |
| 50 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 51 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 52 | ✓ ✓ ✗ ✓ | flaky | customer-format×4 | ok |
| 53 | ✓ ✓ ✓ ✗ | flaky | customer-format×2 | ok |
| 54 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 55 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 56 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 57 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 58 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 59 | ✓ ✓ ✗ ✓ | flaky | customer-format×4 | ok |
| 60 | ✗ ✗ ✓ ✓ | flaky | customer-format×2 | ok |
| 61 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 62 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 63 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 64 | ✗ ✓ ✗ ✗ | flaky | customer-format×4 | ok |
| 65 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 66 | ✗ ✗ ✗ ✗ | fail | customer-format×4 | ok |
| 67 | ✓ ✓ ✓ ✓ | pass | customer-format×1 | ok |
| 68 | ✓ ✓ ✓ ✓ | pass | customer-format×2 | ok |
| 69 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 70 | ✓ ✓ ✓ ✗ | flaky | customer-format×3 | ok |
| 71 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 72 | ✓ ✗ ✓ ✓ | flaky | customer-format×4 | ok |
| 73 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 74 | ✗ ✓ ✓ ✓ | flaky | customer-format×4 | ok |
| 75 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 76 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 77 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 78 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 79 | ✗ ✓ ✗ ✓ | flaky | customer-format×4 | ok |
| 80 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 81 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 82 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 83 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 84 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 85 | ✓ ✓ ✓ ✗ | flaky | customer-format×3 | ok |
| 86 | ✓ ✗ ✓ ✓ | flaky | customer-format×3 | ok |
| 87 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 88 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 89 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 90 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 91 | ✓ ✗ ✓ ✓ | flaky | customer-format×4, different-option×1 | ok |
| 92 | ✓ ✗ ✓ ✓ | flaky | customer-format×4 | ok |
| 93 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 94 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 95 | ✓ ✗ ✓ ✗ | flaky | customer-format×3 | ok |
| 96 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 97 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 98 | ✗ ✓ ✗ ✗ | flaky | customer-format×4 | ok |
| 99 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 100 | ✗ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 101 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 102 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 103 | ✓ ✗ ✓ ✗ | flaky | customer-format×4 | ok |
| 104 | ✓ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 105 | ✗ ✓ ✓ ✓ | flaky | customer-format×4, once-per-order×1, write-error×3 | ok |
| 106 | ✓ ✓ ✓ ✓ | pass | customer-format×4 | ok |
| 107 | ✓ ✗ ✓ ✓ | flaky | customer-format×4, different-option×1 | ok |
| 108 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 109 | ✓ ✗ ✓ ✓ | flaky | customer-format×4 | ok |
| 110 | ✗ ✓ ✓ ✗ | flaky | customer-format×4 | ok |
| 111 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
| 112 | ✗ ✗ ✗ ✗ | fail | customer-format×4, same-product×4 | ok |
| 113 | ✓ ✓ ✓ ✓ | pass | customer-format×3 | ok |
