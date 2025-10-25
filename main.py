import asyncio
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from ourgroceries import InvalidLoginException, OurGroceries
from pydantic import BaseModel

app = FastAPI()

_client_lock = asyncio.Lock()
_client: Optional[OurGroceries] = None


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


async def get_client() -> OurGroceries:
    """Return an authenticated OurGroceries client, reusing the session when available."""
    global _client
    email, password = load_credentials()
    async with _client_lock:
        if _client is None:
            _client = OurGroceries(email, password)

        # Ensure the client holds valid session metadata.
        if getattr(_client, "_session_key", None) is None:
            await _client.login()

        return _client


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


def build_category_index(payload: Any) -> Tuple[List[Dict[str, str]], Dict[str, str]]:
    """Produce ordered category metadata and a lookup table."""
    container = None
    if isinstance(payload, dict):
        container = payload.get("list") or payload.get("categoryList")

    items = []
    if isinstance(container, dict):
        maybe_items = container.get("items")
        if isinstance(maybe_items, list):
            items = maybe_items

    categories: List[Dict[str, str]] = []
    lookup: Dict[str, str] = {}
    for entry in items:
        if not isinstance(entry, dict):
            continue
        cat_id = entry.get("id")
        name = entry.get("value") or entry.get("name")
        if not cat_id or not name:
            continue
        name_str = str(name)
        record: Dict[str, str] = {
            "id": str(cat_id),
            "name": name_str,
        }
        sort_order = entry.get("sortOrder")
        if isinstance(sort_order, str):
            record["sortOrder"] = sort_order
        categories.append(record)
        lookup[str(cat_id)] = name_str

    return categories, lookup


def format_master_list(
    payload: Any,
    categories: List[Dict[str, str]],
    category_lookup: Dict[str, str],
) -> Dict[str, Any]:
    """Return master list metadata grouped by category."""
    data = payload.get("list") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected master list response structure")

    fallback_name = "Master List"
    name = data.get("name") or fallback_name
    raw_items = data.get("items")
    items = raw_items if isinstance(raw_items, list) else []

    sections: List[Dict[str, Any]] = []
    section_lookup: Dict[str, Dict[str, Any]] = {}

    for category in categories:
        section = {
            "id": category["id"],
            "name": category["name"],
            "items": [],
        }
        if "sortOrder" in category:
            section["sortOrder"] = category["sortOrder"]
        section_lookup[category["id"]] = section
        sections.append(section)

    fallback_section = {
        "id": "uncategorized",
        "name": "Uncategorized",
        "items": [],
        "sortOrder": "~~~~",
    }

    flattened_items: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label = item.get("value") or item.get("name")
        if not label:
            continue
        category_id = item.get("categoryId")
        category_id_str = str(category_id) if category_id else None
        entry = {
            "id": item.get("id"),
            "name": str(label),
            "categoryId": category_id_str,
            "categoryName": category_lookup.get(category_id_str, "") if category_id_str else "",
            "crossedOff": item.get("crossedOff", False),
        }
        flattened_items.append(entry)

        section = section_lookup.get(category_id_str) if category_id_str else None
        if section is None:
            section = fallback_section
        section["items"].append(entry)

    if fallback_section["items"]:
        sections.append(fallback_section)

    sections.sort(key=lambda section: section.get("sortOrder") or "~~~~")
    for section in sections:
        section["items"].sort(key=lambda item: item["name"].lower())

    sections.sort(key=lambda section: section.get("sortOrder") or "~~~~")

    return {
        "id": data.get("id"),
        "name": name,
        "itemCount": len(flattened_items),
        "sections": sections,
    }


async def fetch_lists_payload() -> Dict[str, Any]:
    client = await get_client()
    overview = await client.get_my_lists()
    shopping_lists = extract_shopping_lists(overview)
    category_payload = await client.get_category_items()
    categories, category_lookup = build_category_index(category_payload)
    master_payload = await client.get_master_list()
    master_list = format_master_list(master_payload, categories, category_lookup)
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


class MoveItem(BaseModel):
    item_id: str
    item_name: str


class MoveItemsRequest(BaseModel):
    list_id: str
    items: List[MoveItem]
    target_category_id: Optional[str] = None


class DeleteItemsRequest(BaseModel):
    list_id: str
    item_ids: List[str]


@app.post("/api/master/move")
async def api_move_master_item(request: MoveItemsRequest) -> JSONResponse:
    if not request.items:
        raise HTTPException(status_code=400, detail="No items provided for move operation")

    try:
        client = await get_client()
        for entry in request.items:
            await client.change_item_on_list(
                request.list_id,
                entry.item_id,
                request.target_category_id,
                entry.item_name,
            )
    except InvalidLoginException as exc:
        raise HTTPException(status_code=401, detail="OurGroceries login failed") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        payload = await fetch_lists_payload()
    except InvalidLoginException as exc:
        raise HTTPException(status_code=401, detail="OurGroceries login failed") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse({"masterList": payload["masterList"]})


@app.post("/api/master/delete")
async def api_delete_master_items(request: DeleteItemsRequest) -> JSONResponse:
    if not request.item_ids:
        raise HTTPException(status_code=400, detail="No items provided for delete operation")

    try:
        client = await get_client()
        for item_id in request.item_ids:
            await client.remove_item_from_list(request.list_id, item_id)
    except InvalidLoginException as exc:
        raise HTTPException(status_code=401, detail="OurGroceries login failed") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        payload = await fetch_lists_payload()
    except InvalidLoginException as exc:
        raise HTTPException(status_code=401, detail="OurGroceries login failed") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return JSONResponse({"masterList": payload["masterList"]})


app.mount("/", StaticFiles(directory="static", html=True), name="static")


def main() -> None:
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
