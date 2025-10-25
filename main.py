import asyncio
import json
import os
from typing import Iterable

from dotenv import load_dotenv
from ourgroceries import InvalidLoginException, OurGroceries


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


def extract_names(payload) -> list[str]:
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


async def display_list_names() -> None:
    email, password = load_credentials()
    client = OurGroceries(email, password)
    await client.login()
    overview = await client.get_my_lists()
    names = extract_names(overview)
    if names:
        print("Your OurGroceries lists:")
        for name in names:
            print(f"- {name}")
    else:
        print("No list names found; raw response follows:")
        print(json.dumps(overview, indent=2, sort_keys=True))


def main() -> None:
    try:
        asyncio.run(display_list_names())
    except InvalidLoginException as exc:
        raise RuntimeError("OurGroceries login failed") from exc


if __name__ == "__main__":
    main()
