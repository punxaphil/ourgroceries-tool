import os
from functools import lru_cache
from typing import Any

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from ourgroceries import InvalidLoginException, OurGroceries

app = FastAPI()


@lru_cache(maxsize=1)
def load_credentials() -> tuple[str, str]:
    """Load credentials from environment variables and ensure they are set."""
    load_dotenv()
    email = os.getenv("OURGROCERIES_EMAIL", "your_email@example.com")
    password = os.getenv("OURGROCERIES_PASSWORD", "your_password")
    if email == "your_email@example.com" or password == "your_password":
        raise RuntimeError(
            "Set OURGROCERIES_EMAIL and OURGROCERIES_PASSWORD environment variables."
        )
    return email, password


def extract_names(payload: Any) -> list[str]:
    """Extract list names from any list-like structures in the response."""
    names: list[str] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            lowered = key.lower()
            if lowered.endswith("list") or lowered.endswith("lists"):
                if isinstance(value, list):
                    names.extend(
                        item.get("name")
                        for item in value
                        if isinstance(item, dict) and item.get("name")
                    )
            names.extend(extract_names(value))
    elif isinstance(payload, list):
        for item in payload:
            names.extend(extract_names(item))
    # Deduplicate while preserving order
    seen = set()
    unique_names: list[str] = []
    for name in names:
        if name not in seen:
            seen.add(name)
            unique_names.append(name)
    return unique_names


async def fetch_list_names() -> list[str]:
    email, password = load_credentials()
    client = OurGroceries(email, password)
    await client.login()
    overview = await client.get_my_lists()
    names = extract_names(overview)
    if not names:
        raise RuntimeError("No list names found in OurGroceries response")
    return names


@app.get("/api/lists")
async def api_lists() -> JSONResponse:
    try:
        names = await fetch_list_names()
    except InvalidLoginException as exc:
        raise HTTPException(status_code=401, detail="OurGroceries login failed") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return JSONResponse({"lists": names})


app.mount("/", StaticFiles(directory="static", html=True), name="static")


def main() -> None:
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()
