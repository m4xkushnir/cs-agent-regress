| | `claude-sonnet-4-5` | `claude-opus-4-5` | `gpt-5.2` |
|---|---|---|---|
| Trajectories passing | 330 / 456 (72.4%) | 363 / 456 (79.6%) | 372 / 456 (81.6%) |
| Tasks passing every trial | 45 / 114 | 59 / 114 | 59 / 114 |
| Failed trajectories | 126 | 93 | 84 |

Failed trajectories by triage bucket (share of that model's failures):

| Bucket | Category | `claude-sonnet-4-5` | `claude-opus-4-5` | `gpt-5.2` |
|---|---|---|---|---|
| `sim-stop-on-confirm` | benchmark_artifact | 47 (37.3%) | 33 (35.5%) | 19 (22.6%) |
| `ended-in-transfer` | mixed | 28 (22.2%) | 14 (15.1%) | 13 (15.5%) |
| `wrong-variant` | model | 12 (9.5%) | 12 (12.9%) | 20 (23.8%) |
| `missing-write` | mixed | 15 (11.9%) | 9 (9.7%) | 6 (7.1%) |
| `wrong-cancel-reason` | benchmark_artifact | 9 (7.1%) | 5 (5.4%) | 8 (9.5%) |
| `communication-only` | prompt | 8 (6.3%) | 7 (7.5%) | 3 (3.6%) |
| `unwarranted-write` | model | 3 (2.4%) | 9 (9.7%) | 6 (7.1%) |
| `wrong-payment-method` | model | 3 (2.4%) | 3 (3.2%) | 6 (7.1%) |
| `wrong-other-argument` | model | 1 (0.8%) | 1 (1.1%) | 3 (3.6%) |

Trajectories with at least one rule finding (all outcomes):

| Check | `claude-sonnet-4-5` | `claude-opus-4-5` | `gpt-5.2` |
|---|---|---|---|
| `auth-first` | 8 | 11 | 0 |
| `confirm-before-write` | 0 | 1 | 1 |
| `customer-format` | 0 | 0 | 420 |
| `details-before-confirm` | 0 | 1 | 0 |
| `once-per-order` | 5 | 0 | 3 |
| `refund-destination` | 7 | 0 | 0 |
| `same-product` | 12 | 7 | 12 |
| `write-error` | 14 | 2 | 5 |
