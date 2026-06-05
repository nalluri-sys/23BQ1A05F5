"""Stage 1: Priority inbox selector

Fetches notifications from the provided API and prints the top-N priority unread notifications.

Usage:
    python stage1.py --url http://4.224.186.213/evaluation-service/notifications --limit 10 [--auth "Bearer TOKEN"]

"""
import argparse
import requests
from datetime import datetime, timezone
from math import inf


TYPE_WEIGHT = {
    "Placement": 3.0,
    "Result": 2.0,
    "Event": 1.0,
}


def parse_ts(ts_str: str) -> datetime:
    # Expected format: "2026-04-22 17:51:30"
    try:
        return datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:
        # try ISO
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

    # recency factor — recent items get higher score; add 1 to avoid div by zero
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
    parser.add_argument("--auth", help="Optional Authorization header value")
    args = parser.parse_args()

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
