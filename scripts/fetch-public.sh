#!/usr/bin/env bash
# Download the published tau-bench retail trajectories analysed in the README and
# normalize them into data/runs/<run>/run.json.gz. Raw files land in data/public/ (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=https://sierra-tau-bench-public.s3.amazonaws.com/submissions
mkdir -p data/public
fetch() { # run-id model submission file
  local out="data/public/$3.json"
  [[ -f "$out" ]] || curl -sSf -o "$out" "$BASE/$3/trajectories/$4"
  mkdir -p "data/runs/$1"
  node harness/dist/cli.js ingest-results "$out" --run-id "$1" --agent-model "$2" --out "data/runs/$1/run.json.gz"
}
fetch sonnet45 claude-sonnet-4-5 claude-sonnet-4-5_sierra_2026-02-26 claude-sonnet-4-5_enabled_retail_gpt-5.2_4trials.json
fetch opus45   claude-opus-4-5   claude-opus-4-5_sierra_2026-02-26   claude-opus-4-5_high_retail_gpt-5.2_4trials.json
fetch gpt52    gpt-5.2           gpt-5-2_sierra_2026-02-26           gpt-5.2_high_retail_gpt-5.2_4trials.json
