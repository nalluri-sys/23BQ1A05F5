"""Stage 1: Priority inbox selector

Fetch notifications from the API or use sample/local data and print top-N priority unread notifications.

Usage examples:
  python stage1.py --url http://4.224.186.213/evaluation-service/notifications --limit 10 --auth "Bearer ..."
  python stage1.py --url http://example.invalid --limit 5 --sample
  python stage1.py --url http://example.invalid --file notifications.json
"""
from __future__ import annotations
import argparse
import json
from datetime import datetime, timezone
from math import inf

TYPE_WEIGHT = {
    "Placement": 3.0,
    "Result": 2.0,
    "Event": 1.0,
}


def parse_ts(ts_str: str) -> datetime:
    # expected format: "2026-04-22 17:51:30" or ISO
    try:
        return datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.fromisoformat(ts_str)


def score_notification(n: dict, now: datetime) -> float:
    t = n.get("Type", "Event")
    wt = TYPE_WEIGHT.get(t, 1.0)
    ts_raw = n.get("Timestamp") or n.get("timestamp")
    if not ts_raw:
        age_hours = inf
    else:
        try:
            ts = parse_ts(ts_raw)
            age_seconds = max(0.0, (now - ts).total_seconds())
            age_hours = age_seconds / 3600.0
        except Exception:
            age_hours = inf

    recency = 1.0 + 1.0 / (1.0 + age_hours)
    return wt * recency


def top_n_notifications(notifications: list, n: int = 10) -> list:
    now = datetime.now(timezone.utc)
    scored = []
    for item in notifications:
        s = score_notification(item, now)
        scored.append((s, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [it for _, it in scored[:n]]


def fetch_notifications(url: str, auth: str | None = None) -> list:
    # Lazy import requests only when needed
    import requests

    headers = {}
    if auth:
        headers["Authorization"] = auth
    r = requests.get(url, headers=headers, timeout=10)
    r.raise_for_status()
    data = r.json()
    return data.get("notifications") or data.get("data") or []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--sample", action="store_true", help="Use embedded sample notifications instead of calling the API")
    parser.add_argument("--file", help="Path to local JSON file containing notifications (overrides --url)")
    parser.add_argument("--auth", help="Optional Authorization header value")
    args = parser.parse_args()

    if args.file:
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print("Failed to read file:", e)
            return
        if isinstance(data, dict):
            notifs = data.get("notifications") or data.get("data") or []
        elif isinstance(data, list):
            notifs = data
        else:
            print("Unrecognized JSON structure in file")
            return
    elif args.sample:
        now = datetime.now(timezone.utc)
        sample = [
            {"ID": "a1", "Type": "Placement", "Message": "Company X hiring", "Timestamp": now.strftime("%Y-%m-%d %H:%M:%S")},
            {"ID": "a2", "Type": "Result", "Message": "Exam results published", "Timestamp": now.strftime("%Y-%m-%d %H:%M:%S")},
            {"ID": "a3", "Type": "Event", "Message": "Campus meetup", "Timestamp": now.strftime("%Y-%m-%d %H:%M:%S")},
            {"ID": "a4", "Type": "Placement", "Message": "Internship drive", "Timestamp": now.strftime("%Y-%m-%d %H:%M:%S")},
        ]
        notifs = sample
    else:
        try:
            notifs = fetch_notifications(args.url, args.auth)
        except Exception as e:
            print("Failed to fetch notifications:", e)
            return

    top = top_n_notifications(notifs, args.limit)
    print(f"Top {len(top)} priority notifications:\n")
    for i, it in enumerate(top, 1):
        print(f"{i}. [{it.get('Type')}] {it.get('Message')} (ID={it.get('ID')}) Timestamp={it.get('Timestamp')}")


if __name__ == "__main__":
    main()
