#!/usr/bin/env python3
"""
Small runner for staged GraphQL metadata files.

Reads connection settings from an ignored dotenv file:
- `.env`
- `graphql/.env`

Expected variables:
USERNAME=your-username
PASSWORD=your-password
SERVER_URL=https://your-server/content-services-graphql/graphql

Usage:
  python graphql/run_graphql.py graphql/01-choice-lists.graphql
  python graphql/run_graphql.py graphql/02-property-templates.graphql
  python graphql/run_graphql.py graphql/03-class-definition.graphql
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List

import requests


DOTENV_CANDIDATES = [Path("graphql/.env"), Path(".env")]
DEFAULT_TIMEOUT_SECONDS = 60


def parse_dotenv(dotenv_path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        values[key] = value

    return values


def load_config() -> dict:
    dotenv_path = next((candidate for candidate in DOTENV_CANDIDATES if candidate.exists()), None)
    if dotenv_path is None:
        raise FileNotFoundError(
            "Missing dotenv file. Create either graphql/.env or .env "
            "with USERNAME, PASSWORD, and SERVER_URL."
        )

    config = parse_dotenv(dotenv_path)

    required_keys = ["USERNAME", "PASSWORD", "SERVER_URL"]
    missing = [key for key in required_keys if not config.get(key)]
    if missing:
        raise ValueError(f"Missing required config keys in {dotenv_path}: {', '.join(missing)}")

    return config


def strip_comments(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if line.lstrip().startswith("#"):
            continue
        lines.append(line)
    return "\n".join(lines)


def split_mutations(text: str) -> List[str]:
    cleaned = strip_comments(text).strip()
    if not cleaned:
        return []

    pattern = re.compile(r"(?=mutation\s+[A-Za-z0-9_]+\s*\{)")
    parts = [part.strip() for part in pattern.split(cleaned) if part.strip()]
    return parts


def get_mutation_name(mutation: str) -> str:
    match = re.search(r"mutation\s+([A-Za-z0-9_]+)\s*\{", mutation)
    return match.group(1) if match else "UnnamedMutation"


def execute_mutation(server_url: str, username: str, password: str, mutation: str, timeout: int) -> dict:
    response = requests.post(
        server_url,
        json={"query": mutation},
        auth=(username, password),
        headers={"Content-Type": "application/json"},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def main() -> int:
    parser = argparse.ArgumentParser(description="Execute staged GraphQL mutation files.")
    parser.add_argument("graphql_file", help="Path to a .graphql file containing one or more mutations.")
    parser.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Stop execution immediately when a mutation fails.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"HTTP timeout in seconds. Default: {DEFAULT_TIMEOUT_SECONDS}",
    )
    args = parser.parse_args()

    graphql_path = Path(args.graphql_file)
    if not graphql_path.exists():
        print(f"GraphQL file not found: {graphql_path}", file=sys.stderr)
        return 1

    try:
        config = load_config()
    except Exception as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 1

    source_text = graphql_path.read_text(encoding="utf-8")
    mutations = split_mutations(source_text)

    if not mutations:
        print(f"No mutations found in {graphql_path}", file=sys.stderr)
        return 1

    print(f"Loaded {len(mutations)} mutation(s) from {graphql_path}")

    failures = 0
    for index, mutation in enumerate(mutations, start=1):
        mutation_name = get_mutation_name(mutation)
        print(f"\n[{index}/{len(mutations)}] Executing {mutation_name} ...")

        try:
            payload = execute_mutation(
                server_url=config["SERVER_URL"],
                username=config["USERNAME"],
                password=config["PASSWORD"],
                mutation=mutation,
                timeout=args.timeout,
            )
        except requests.HTTPError as exc:
            failures += 1
            print(f"HTTP error for {mutation_name}: {exc}", file=sys.stderr)
            if exc.response is not None:
                print(exc.response.text, file=sys.stderr)
            if args.stop_on_error:
                return 1
            continue
        except Exception as exc:
            failures += 1
            print(f"Execution error for {mutation_name}: {exc}", file=sys.stderr)
            if args.stop_on_error:
                return 1
            continue

        if payload.get("errors"):
            failures += 1
            print(f"GraphQL errors for {mutation_name}:", file=sys.stderr)
            print(json.dumps(payload["errors"], indent=2), file=sys.stderr)
            if args.stop_on_error:
                return 1
            continue

        print("Success")
        print(json.dumps(payload.get("data", {}), indent=2))

    if failures:
        print(f"\nCompleted with {failures} failed mutation(s).", file=sys.stderr)
        return 1

    print("\nAll mutations executed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# Made with Bob
