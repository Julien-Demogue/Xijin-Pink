"""Ask the operator assistant a question. Run:
    python ask.py "comment réagir à un pic de latence sur payment-api ?"
    python ask.py --explain            # explain the latest live alert
"""

import argparse

from rag.assistant import Assistant


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("question", nargs="*", help="the operator's question")
    ap.add_argument("--explain", action="store_true", help="explain the latest live alert")
    ap.add_argument("--alert-id", help="explain a specific alert id")
    args = ap.parse_args()

    assistant = Assistant()
    if args.explain or args.alert_id:
        result = assistant.explain_alert(alert_id=args.alert_id)
    else:
        result = assistant.answer(" ".join(args.question))

    print("\n" + result["answer"] + "\n")
    print("sources:")
    for c in result["citations"]:
        print(f"  [{c['n']}] {c['path']} :: {c['heading']}  ({c['score']})")


if __name__ == "__main__":
    main()
