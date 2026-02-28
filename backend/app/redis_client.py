"""
app/redis_client.py
───────────────────
Provides:
  - `redis_conn`  : raw Redis connection (for SSE pub/sub + direct key reads)
  - `task_queue`  : RQ Queue for dispatching background pipeline tasks
"""

import redis
from rq import Queue

from app.config import settings


# ── Redis Connection ───────────────────────────────────────────────────────
# decode_responses=False is required by RQ (it handles its own serialization)
redis_conn = redis.from_url(
    settings.redis_url,
    decode_responses=False,
)

# ── RQ Task Queue ──────────────────────────────────────────────────────────
# All pipeline tasks (clarifier, researcher, etc.) go into this queue.
# The worker.py process listens on this queue.
task_queue = Queue(
    name="landylocal",
    connection=redis_conn,
    default_timeout=300,  # 5 min max per task before it's marked failed
)


def publish_job_update(job_id: str, data: dict) -> None:
    """
    Publishes a job status update to a Redis pub/sub channel.
    The SSE endpoint subscribes to this channel and forwards
    updates to the connected browser in real time.

    Args:
        job_id: The UUID of the landing page job.
        data:   Dict with keys: 'status', 'step', 'message', 'payload'
    """
    import json

    channel = f"job:{job_id}:updates"
    redis_conn.publish(channel, json.dumps(data))
