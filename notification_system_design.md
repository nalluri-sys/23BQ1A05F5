# Stage 1

## Problem

Show the top-N most important unread notifications ordered by priority, where priority is based on type (Placement > Result > Event) and recency.

## Approach

- Assign weights to notification types: Placement=3, Result=2, Event=1.
- Compute a recency multiplier based on age in hours: recency = 1 + 1/(1 + age_hours).
- Final score = type_weight * recency. Sort descending and pick top N.

This balances importance (type) with freshness (recency).

## Efficient maintenance of top-N

When new notifications arrive continuously, keep a min-heap of size N keyed by score. For each incoming notification:

- Compute score.
- If heap size < N, push.
- Else if score > heap[0], pop then push.

This yields O(log N) per insertion and O(N) memory.

## Notes

- The API is a protected route; `stage1.py` accepts an optional `--auth` header value to pass through.
- Timestamps should be normalized to UTC when computing age.
