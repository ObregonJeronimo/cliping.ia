import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    # sin reload para que el policy se mantenga en el proceso principal
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
