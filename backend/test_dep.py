from fastapi import FastAPI, Depends
from aiosqlite import Connection
from typing import Annotated, AsyncGenerator
import aiosqlite

app = FastAPI()

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    async with aiosqlite.connect(":memory:") as db:
        yield db

DbDep = Annotated[aiosqlite.Connection, Depends(get_db)]

@app.get("/test")
async def test(db: DbDep):
    return {"status": "ok", "type": str(type(db))}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
