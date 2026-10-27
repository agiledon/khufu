#!/usr/bin/env python3
"""Decide what a khufu-to-test-cases invocation asked for.

The input is only the user's words after the slash command. An empty input
means there is no PRD path. Paths found on disk, and paths written inside
SKILL.md, are not input and cannot produce a "use" decision.

Usage:
  python3 resolve_prd_args.py --phase confirm -- "user text"
  python3 resolve_prd_args.py --phase select -- "user text"
  python3 resolve_prd_args.py --self-test

--phase confirm is the default. A bare number then means option 1, 2, or 3
of the first question. It never means "use scanned file N".
--phase select is valid only after a numbered PRD list was shown.
"""

from __future__ import annotations

import json
import re
import sys

SENTINEL = "KHUFU_TO_TEST_CASES_SKILL_BODY"
INDEX_NAMES = {"prd-catalog.md", "readme.md"}
SCAN_PHRASES = {"扫描已有", "不指定", "不指定路径", "扫描", "scan"}
NO_PRD_PHRASES = {"还没有prd", "没有prd", "无prd", "no prd", "没有 prd"}
NEED_PATH_PHRASES = {"指定路径", "指定prd", "指定 prd"}

MD_PATH = re.compile(
    r"@?((?:(?:~|\.{1,2})/|/)(?:[\w.-]+/)*[\w.-]+\.md|(?:[\w.-]+/)+[\w.-]+\.md)",
    re.IGNORECASE,
)
COMMAND = re.compile(r"^/khufu-to-test-cases(?:/SKILL)?\b\s*", re.IGNORECASE)
SELECT = re.compile(r"^[\d\s,，、和及]+$")
SELECT_ALL = re.compile(r"^(全部|所有|all)$", re.IGNORECASE)


def decide(raw: str, phase: str = "confirm") -> dict:
    if phase not in {"confirm", "select"}:
        phase = "confirm"
    if SENTINEL in raw:
        return _result("ask", "refused_skill_body")

    text = COMMAND.sub("", raw.strip())
    text = text.strip().strip("\"'`")
    if not text:
        return _result("ask", "empty")

    paths, ignored = _paths(text)
    if paths:
        return _result("use", "explicit_paths", paths=paths, ignored_indexes=ignored)
    if ignored:
        return _result("ask", "only_indexes", ignored_indexes=ignored)

    compact = re.sub(r"\s+", "", text).lower()
    choice = _confirm_choice(text, compact)
    if phase == "select":
        return _decide_select(text, compact, choice)
    return _decide_confirm(text, choice)


def _paths(text: str) -> tuple[list[str], list[str]]:
    paths: list[str] = []
    ignored: list[str] = []
    for match in MD_PATH.finditer(text):
        token = match.group(1).lstrip("@")
        name = token.replace("\\", "/").rstrip("/").split("/")[-1].lower()
        if name in INDEX_NAMES:
            ignored.append(token)
        else:
            paths.append(token)
    return _unique(paths), ignored


def _confirm_choice(text: str, compact: str) -> str | None:
    """Map the first question's reply to 1, 2, or 3. Anything else is None."""
    if compact in NEED_PATH_PHRASES:
        return "1"
    if compact in SCAN_PHRASES:
        return "2"
    if compact in NO_PRD_PHRASES:
        return "3"
    matched = re.fullmatch(r"([123])(?:\s*[\.、:：]\s*(.*))?$", text.strip())
    if not matched:
        return None
    number, rest = matched.group(1), (matched.group(2) or "").strip()
    if not rest:
        return number
    rest_compact = re.sub(r"\s+", "", rest).lower()
    expected = {"1": NEED_PATH_PHRASES, "2": SCAN_PHRASES, "3": NO_PRD_PHRASES}[number]
    if rest_compact in expected:
        return number
    return None


def _decide_confirm(text: str, choice: str | None) -> dict:
    if choice == "3":
        return _result("no_prd", "user_has_no_prd")
    if choice == "2":
        return _result("scan", "user_declined_path")
    if choice == "1":
        return _result("ask", "specify_without_path")
    if SELECT_ALL.match(text) or SELECT.match(text):
        return _result("ask", "not_a_selection")
    return _result("ask", "no_path_token")


def _decide_select(text: str, compact: str, choice: str | None) -> dict:
    if SELECT_ALL.match(text):
        return _result("select_all", "user_selected_all")
    if SELECT.match(text):
        indexes = [int(n) for n in re.findall(r"\d+", text)]
        return _result("select", "user_selected_indexes", indexes=indexes)
    if choice == "3" or compact in NO_PRD_PHRASES:
        return _result("no_prd", "user_has_no_prd")
    if choice == "2" or compact in SCAN_PHRASES:
        return _result("scan", "user_declined_path")
    if choice == "1" or compact in NEED_PATH_PHRASES:
        return _result("ask", "specify_without_path")
    return _result("ask", "no_path_token")


def _unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def _result(
    decision: str,
    reason: str,
    paths: list[str] | None = None,
    ignored_indexes: list[str] | None = None,
    indexes: list[int] | None = None,
) -> dict:
    body = {
        "decision": decision,
        "has_path": decision == "use",
        "reason": reason,
        "paths": paths or [],
        "ignored_indexes": ignored_indexes or [],
        "indexes": indexes or [],
    }
    return body


def self_test() -> None:
    confirm_cases = [
        ("", "ask", "empty"),
        ("/khufu-to-test-cases", "ask", "empty"),
        ("/khufu-to-test-cases   ", "ask", "empty"),
        ("请生成测试用例", "ask", "no_path_token"),
        ("prd-mvp1.md", "ask", "no_path_token"),
        ("docs/prd", "ask", "no_path_token"),
        ("指定路径", "ask", "specify_without_path"),
        ("1", "ask", "specify_without_path"),
        ("2", "scan", "user_declined_path"),
        ("2. 扫描已有", "scan", "user_declined_path"),
        ("3", "no_prd", "user_has_no_prd"),
        ("扫描已有", "scan", "user_declined_path"),
        ("还没有 PRD", "no_prd", "user_has_no_prd"),
        ("1, 2", "ask", "not_a_selection"),
        ("全部", "ask", "not_a_selection"),
        ("@docs/prd/prd-mvp1.md", "use", "explicit_paths"),
        ("docs/prd/prd-mvp1.md docs/prd/prd-mvp2.md", "use", "explicit_paths"),
        ("docs/prd/prd-catalog.md", "ask", "only_indexes"),
        (f"see {SENTINEL} docs/prd/prd-mvp1.md", "ask", "refused_skill_body"),
    ]
    select_cases = [
        ("1", "select", "user_selected_indexes"),
        ("1, 2", "select", "user_selected_indexes"),
        ("全部", "select_all", "user_selected_all"),
        ("2", "select", "user_selected_indexes"),
        ("扫描已有", "scan", "user_declined_path"),
        ("docs/prd/prd-mvp1.md", "use", "explicit_paths"),
    ]
    for raw, decision, reason in confirm_cases:
        got = decide(raw, "confirm")
        if got["decision"] != decision or got["reason"] != reason:
            raise SystemExit(f"confirm failed for {raw!r}: {got}")
    for raw, decision, reason in select_cases:
        got = decide(raw, "select")
        if got["decision"] != decision or got["reason"] != reason:
            raise SystemExit(f"select failed for {raw!r}: {got}")
    # A forgotten phase must not treat "2" as scanned file 2.
    forgotten = decide("2")
    if forgotten["decision"] != "scan":
        raise SystemExit(f"default phase failed: {forgotten}")
    two = decide("docs/prd/a.md docs/prd/b.md")
    if two["paths"] != ["docs/prd/a.md", "docs/prd/b.md"]:
        raise SystemExit(f"paths failed: {two}")
    picked = decide("1, 2", "select")
    if picked["indexes"] != [1, 2]:
        raise SystemExit(f"indexes failed: {picked}")
    print("ok")


def main() -> None:
    args = sys.argv[1:]
    if args == ["--self-test"]:
        self_test()
        return
    phase = "confirm"
    if len(args) >= 2 and args[0] == "--phase":
        phase = args[1]
        args = args[2:]
    if args[:1] == ["--"]:
        raw = " ".join(args[1:])
    elif args:
        raw = " ".join(args)
    else:
        raw = sys.stdin.read()
    json.dump(decide(raw, phase), sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
