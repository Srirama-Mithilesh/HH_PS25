from fastapi import FastAPI, Query
from app.workers.celery_app import celery_app
import app.workers.tasks

app = FastAPI()

@app.post("/generate")
def generate_city(city: str = Query(...)):
    print("🔥 Received city:", city)
    task = celery_app.send_task("tasks.generate_city", args=[city])
    print("📨 Task created:", task.id)
    return {"task_id": task.id, "status": "queued"}
