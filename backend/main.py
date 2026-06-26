from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import whisper
from whisper.utils import format_timestamp
import asyncio
import json
import threading

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading Whisper model 'base'...")
model = whisper.load_model("base")
print("Model loaded successfully.")

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    temp_file_path = f"temp_{file.filename}"
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()
    
    def whisper_callback(segment):
        # Safely put the segment into the async queue from the background thread
        asyncio.run_coroutine_threadsafe(queue.put(segment), loop)
        
    def run_transcription():
        try:
            model.transcribe(temp_file_path, callback=whisper_callback, verbose=False)
        except Exception as e:
            asyncio.run_coroutine_threadsafe(queue.put({"error": str(e)}), loop)
        finally:
            # Signal completion
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    # Start transcription in a separate thread so we don't block the FastAPI event loop
    thread = threading.Thread(target=run_transcription)
    thread.start()
    
    async def event_generator():
        while True:
            segment = await queue.get()
            if segment is None:
                # End of transcription
                yield "data: [DONE]\n\n"
                break
            if "error" in segment:
                yield f"data: {json.dumps({'error': segment['error']})}\n\n"
                break
                
            text = segment.get("text", "")
            if text:
                start = segment.get("start", 0.0)
                end = segment.get("end", 0.0)
                formatted = f"[{format_timestamp(start)} --> {format_timestamp(end)}] {text.lstrip()}\n"
                yield f"data: {json.dumps({'text': formatted})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
