"""Run tau-bench retail tasks with a content-addressed LLM cache and a hard budget cap.

Every model call goes through `cached_completion`. A call is keyed by
(model, prompt version, input hash, trial salt). The prompt version is the
hash of the call's system message, so it cannot drift from the text that was
actually sent. The trial salt keeps independent trials of the same task from
replaying each other while still letting a rerun of the same trial replay for free.

Real (uncached) calls are priced from PRICES and appended to the ledger. Before
each real call the ledger total is checked against the cap; once the cap minus
a reserve is reached, every further call raises BudgetExceeded.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import threading
from string import Template
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


import litellm  # noqa: E402
from litellm.main import ModelResponse  # noqa: E402

import tau2.agent.llm_agent as llm_agent  # noqa: E402
import tau2.evaluator.evaluator_nl_assertions as nl_eval  # noqa: E402
import tau2.user.guidelines as guidelines  # noqa: E402
import tau2.utils.llm_utils as llm_utils  # noqa: E402
from tau2.cli import main as tau2_main  # noqa: E402

# USD per million tokens: input, output, cache read, cache write.
PRICES = {
    "claude-haiku-5-5": (0.10, 0.50, 0.01, 0.125),
    "claude-sonnet-5-5": (2.00, 10.00, 0.20, 2.50),
    "claude-opus-5-5": (4.00, 20.00, 0.20, 5.00),
}
RESERVE_USD = 1.0

# The stock simulator ends the chat as soon as it thinks its goal is met, which it often
# decides at the moment it says "yes" to a confirmation. The agent then never gets a turn
# to perform the action, and the run scores as a failure. This rewording makes the
# simulator wait until the agent reports the action done.
# tau2's text templates spell it "satisified"; the voice templates spell it correctly.
STOP_LINE = re.compile(r"- If the instruction goal is satis(?:f|if)ied, generate the '###STOP###' token to end the conversation\.")
STOP_AFTER_COMPLETION = (
    "- If the instruction goal is satisfied, generate the '###STOP###' token to end the conversation. "
    "Agreeing to a proposed action does not satisfy the goal: after you confirm, wait for the agent's "
    "next message saying the action was completed before you generate '###STOP###'."
)


def apply_sim_fix() -> list[str]:
    """Rewrite the STOP rule in the simulator's guideline templates; return the names changed."""
    changed = []
    for name, value in vars(guidelines).items():
        if isinstance(value, Template) and STOP_LINE.search(value.template):
            value.template = STOP_LINE.sub(STOP_AFTER_COMPLETION, value.template)
            changed.append(name)
    return sorted(changed)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--agent-model", default="claude-haiku-5-5")
    ap.add_argument("--user-model", default="claude-sonnet-5-5")
    ap.add_argument("--judge-model", default="claude-sonnet-5-5",
                    help="replaces tau2's pinned NL-assertion judge")
    ap.add_argument("--prompt", default="agent_v1", help="file stem under runner/prompts")
    ap.add_argument("--split", default="test")
    ap.add_argument("--task-ids", nargs="*")
    ap.add_argument("--trials", type=int, default=2)
    ap.add_argument("--budget-usd", type=float, default=40.0)
    ap.add_argument("--max-concurrency", type=int, default=3)
    ap.add_argument("--offline", action="store_true", help="fail on any cache miss")
    ap.add_argument("--sim-fix", action="store_true",
                    help="make the simulated customer wait for completion before ending the chat")
    args = ap.parse_args()

    run_dir = ROOT / "data" / "runs" / args.run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    cache = CallCache(ROOT / "data" / "cache" / "llm", ROOT / "data" / "ledger.jsonl",
                      args.budget_usd, args.offline)
    cache.run_id = args.run_id

    instruction = (ROOT / "runner" / "prompts" / f"{args.prompt}.md").read_text().strip()
    llm_agent.AGENT_INSTRUCTION = instruction
    llm_utils.completion = cache.completion
    nl_eval.DEFAULT_LLM_NL_ASSERTIONS = args.judge_model
    nl_eval.DEFAULT_LLM_NL_ASSERTIONS_ARGS = {}
    if args.sim_fix:
        changed = apply_sim_fix()
        if not {"_TEXT_PLAIN", "_TEXT_TOOLS"} <= set(changed):
            print(f"--sim-fix: text templates not patched (changed {changed}); refusing to run", file=sys.stderr)
            return 2

    (run_dir / "config.json").write_text(json.dumps({
        "agent_model": args.agent_model, "user_model": args.user_model,
        "judge_model": args.judge_model, "prompt": args.prompt,
        "prompt_sha": _sha(instruction)[:12], "split": args.split,
        "task_ids": args.task_ids, "trials": args.trials,
        "tau2_version": "2.0.0", "communicate_scorer": "substring", "sim_fix": args.sim_fix,
    }, indent=2, sort_keys=True) + "\n")

    for trial in range(args.trials):
        cache.salt = f"trial-{trial}"
        out = run_dir / f"trial-{trial}.json"
        argv = ["tau2", "run", "--domain", "retail",
                "--agent-llm", args.agent_model, "--agent-llm-args", "{}",
                "--user-llm", args.user_model, "--user-llm-args", "{}",
                "--communicate-scorer", "substring",
                "--num-trials", "1", "--seed", str(300 + trial),
                "--max-concurrency", str(args.max_concurrency),
                "--save-to", str(out), "--auto-resume", "--log-level", "ERROR"]
        argv += ["--task-ids", *args.task_ids] if args.task_ids else ["--task-split-name", args.split]
        sys.argv = argv
        try:
            tau2_main()
        except SystemExit as e:
            if e.code not in (0, None):
                print(f"tau2 exited {e.code} on trial {trial}", file=sys.stderr)
                return int(e.code)
        print(f"trial {trial}: cache hits {cache.hits}, misses {cache.misses}, "
              f"ledger ${cache.spent:.4f} / ${args.budget_usd:.2f}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
