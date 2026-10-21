"""Run a full, realistic red-team campaign and emit a labeled run manifest.

Timeline: a warm-up of normal-only traffic (the "before" baseline), then each
attack episode injected *while normal traffic keeps flowing*, separated by quiet
gaps, then a cool-down. Produces data/manifest.json (epoch start/end per episode)
to label the Loki export.

    python redteam/campaign.py                 # full ~15 min campaign
    python redteam/campaign.py --quick         # ~2.5 min smoke test
    python redteam/campaign.py --only injection

Then export + label:
    python tools/dataset/export_loki.py --since <run_start> --until <run_end> \
        --out data/attacks.jsonl
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time

from _client import Manifest
from attacks import SCENARIOS

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["availability", "auth-abuse", "scraping", "injection", "exfiltration"]


def start_normal(total_duration, rate):
    """Launch the normal traffic generator for the whole campaign, in background."""
    script = os.path.join(REPO, "tools", "traffic", "normal_traffic.py")
    return subprocess.Popen(
        [sys.executable, script, "--duration", str(int(total_duration + 5)), "--rate", str(rate)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    ap = argparse.ArgumentParser(description="Red-team campaign (own app only)")
    ap.add_argument("--quick", action="store_true", help="short durations for a smoke test")
    ap.add_argument("--only", choices=ORDER, help="run a single scenario")
    ap.add_argument("--manifest", default=os.path.join(REPO, "data", "manifest.json"))
    ap.add_argument("--normal-rate", type=float, default=5.0)
    ap.add_argument("--no-normal", action="store_true", help="skip the normal background traffic")
    ap.add_argument("--warmup", type=int)
    ap.add_argument("--dur", type=int, help="attack episode length (s)")
    ap.add_argument("--gap", type=int, help="quiet gap between episodes (s)")
    ap.add_argument("--cooldown", type=int)
    ap.add_argument("--rounds", type=int, default=1, help="repeat the scenario sequence N times")
    args = ap.parse_args()

    if args.quick:
        warmup, dur, gap, cooldown = 15, 15, 10, 15
    else:
        warmup, dur, gap, cooldown = 90, 60, 90, 60
    # explicit flags override the preset
    warmup = args.warmup if args.warmup is not None else warmup
    dur = args.dur if args.dur is not None else dur
    gap = args.gap if args.gap is not None else gap
    cooldown = args.cooldown if args.cooldown is not None else cooldown

    base = [args.only] if args.only else ORDER
    scenarios = base * args.rounds
    total = warmup + len(scenarios) * (dur + gap) + cooldown

    os.makedirs(os.path.dirname(args.manifest), exist_ok=True)
    print(f"campaign: {len(scenarios)} scenario(s), ~{total:.0f}s total "
          f"(warmup {warmup}s, each {dur}s +{gap}s gap, cooldown {cooldown}s)")

    normal = None if args.no_normal else start_normal(total, args.normal_rate)
    manifest = Manifest()

    try:
        print(f"warm-up: normal traffic only for {warmup}s ...")
        time.sleep(warmup)
        for name in scenarios:
            print(f"-> attack: {name} ({dur}s) + normal traffic")
            episode = SCENARIOS[name](duration=dur)
            manifest.record(episode)
            if name != scenarios[-1] or True:
                print(f"   gap: {gap}s normal-only")
                time.sleep(gap)
        print(f"cool-down: {cooldown}s normal-only ...")
        time.sleep(cooldown)
    finally:
        manifest.save(args.manifest)
        if normal and normal.poll() is None:
            normal.terminate()

    print(f"\nrun window: {manifest.run_start:.0f} .. {manifest.run_end:.0f}")
    print("next: export that window with tools/dataset/export_loki.py")


if __name__ == "__main__":
    main()
