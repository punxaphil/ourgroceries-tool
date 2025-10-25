import os
from functools import lru_cache
from typing import Any, Dict, List

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


def extract_shopping_lists(payload: Any) -> List[Dict[str, str]]:
    """Collect shopping list summaries (id + name) from nested payloads."""
    summaries: List[Dict[str, str]] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            lowered = key.lower()
            if lowered.endswith("list") or lowered.endswith("lists"):
                if isinstance(value, list):
                    summaries.extend(
                        {
                            "id": str(item.get("id")),
                            "name": str(item.get("name")),
                        }
                        for item in value
                        if isinstance(item, dict) and item.get("name")
                    )
            summaries.extend(extract_shopping_lists(value))
    elif isinstance(payload, list):
        for item in payload:
            summaries.extend(extract_shopping_lists(item))

    seen_ids: set[str] = set()
    unique: List[Dict[str, str]] = []
    for summary in summaries:
        identifier = summary.get("id")
        if identifier and identifier not in seen_ids:
            seen_ids.add(identifier)
            unique.append(summary)
    return unique


def format_master_list(payload: Any) -> Dict[str, Any]:
    """Return master list metadata along with item summaries."""
    data = payload.get("list") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected master list response structure")

    fallback_name = "Master List"
    name = data.get("name") or fallback_name
    items = data.get("items") if isinstance(data.get("items"), list) else []

    item_summaries: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label = item.get("value") or item.get("name")
        if not label:
            continue
        item_summaries.append(
            {
                "id": item.get("id"),
                "name": label,
                "categoryId": item.get("categoryId"),
                "crossedOff": item.get("crossedOff", False),
            }
        )

    return {
        "id": data.get("id"),
        "name": name,
        "items": item_summaries,
        "itemCount": len(item_summaries),
    }


async def fetch_lists_payload() -> Dict[str, Any]:
    email, password = load_credentials()
    client = OurGroceries(email, password)
    await client.login()
    overview = await client.get_my_lists()
    shopping_lists = extract_shopping_lists(overview)
    master_list = format_master_list(await client.get_master_list())
    if not shopping_lists:
        raise RuntimeError("No shopping lists found in OurGroceries response")
    return {
        "lists": shopping_lists,
        "masterList": master_list,
    }


@app.get("/api/lists")
async def api_lists() -> JSONResponse:
    try:
        payload = await fetch_lists_payload()
    except InvalidLoginException as exc:
        raise HTTPException(status_code=401, detail="OurGroceries login failed") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return JSONResponse(payload)


app.mount("/", StaticFiles(directory="static", html=True), name="static")


def main() -> None:
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()
