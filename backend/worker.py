"""
worker.py
─────────
RQ Worker entry point.

Run this in a SEPARATE terminal alongside uvicorn:
    source venv/bin/activate
    python worker.py

This process continuously listens for tasks on the "landylocal"
queue and executes them synchronously (no async — RQ is sync).
"""

from dotenv import load_dotenv
load_dotenv()  # Must load before importing settings

from rq import Worker
from app.redis_client import redis_conn, task_queue

if __name__ == "__main__":
    print("🔧 LandyLocal RQ Worker starting...")
    print(f"📡 Listening on queue: {task_queue.name}")

    worker = Worker(
        queues=[task_queue],
        connection=redis_conn,
    )
    worker.work(with_scheduler=True)
