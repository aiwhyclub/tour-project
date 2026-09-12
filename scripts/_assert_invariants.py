#!/usr/bin/env python3
"""
/api/plan 정상 응답 1건에 대해 프로젝트 불변식을 검증한다.
docs/09_점검체크리스트.md §6 · check-live.sh --full 에서 호출된다.

    python3 scripts/_assert_invariants.py <응답.json>

종료 코드: 0 = 전부 통과 · 1 = 하나 이상 실패

이 검증이 존재하는 이유: 목업은 고정 픽스처라 늘 통과하지만, 실연동은 모델
응답이 매번 다르고 R8 재계산(서버가 모든 산술을 다시 한다)이 실제로 일하는
유일한 경로다. 실연동으로 전환한 직후 반드시 한 번 돌린다.
"""

from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

LBL = 30
GREEN, RED, DIM, RESET = "\033[32m", "\033[31m", "\033[2m", "\033[0m"
if not sys.stdout.isatty():
    GREEN = RED = DIM = RESET = ""


def pad(s: str, width: int = LBL) -> str:
    """한글은 2칸을 차지하므로 표시 폭으로 맞춘다."""
    disp = sum(2 if unicodedata.east_asian_width(c) in ("W", "F") else 1 for c in s)
    return s + " " * max(0, width - disp)


failures = 0
passes = 0


def chk(name: str, cond: bool, detail: str = "") -> None:
    global failures, passes
    if cond:
        passes += 1
    else:
        failures += 1
    mark = f"{GREEN}PASS{RESET}" if cond else f"{RED}FAIL{RESET}"
    print(f"  {mark}  {pad(name)}  {detail}")


def info(name: str, detail: str) -> None:
    print(f"  {DIM}INFO{RESET}  {pad(name)}  {detail}")


def main(path: str) -> int:
    global failures
    payload = json.load(open(path, encoding="utf-8"))
    if not payload.get("ok"):
        # failures 를 올리지 않으면 집계가 0 으로 넘어가 호출자가 실패를 놓친다.
        failures += 1
        print(f"  {RED}FAIL{RESET}  {pad('응답 ok')}  {payload.get('error')}")
        return 1

    plan = payload["data"]
    budget = plan["budget"]

    # ── R8: 서버가 모든 산술을 재계산한다 ────────────────────────────────
    line_sum = sum(l["estimate"]["amount"] for l in budget["lines"])
    chk("R8 총계", line_sum == budget["total"]["amount"],
        f"Σ{line_sum:,} == {budget['total']['amount']:,}")

    low = sum(l["estimate"]["rangeLow"] for l in budget["lines"])
    high = sum(l["estimate"]["rangeHigh"] for l in budget["lines"])
    chk("R8 범위",
        low == budget["total"]["rangeLow"] and high == budget["total"]["rangeHigh"],
        f"low {low:,} · high {high:,}")

    day_mismatch = [
        d["dayIndex"]
        for d in plan["days"]
        if sum(i["cost"]["amount"] for i in d["items"] if i.get("cost"))
        != d.get("daySubtotal", {}).get("amount")
    ]
    chk("R8 일자 소계", not day_mismatch,
        f"{len(plan['days'])}일 전부 일치" if not day_mismatch
        else f"불일치: {day_mismatch}일차")

    # 3×33.3 잔차 보정이 살아 있는가
    share = round(sum(l["sharePercent"] for l in budget["lines"]), 6)
    chk("비중 합", share == 100.0, f"{share}")

    blob = json.dumps(plan, ensure_ascii=False)

    # ── R1: 확정 가격 금지 ──────────────────────────────────────────────
    chk("R1 confirmed 0건", "confirmed" not in blob)

    seen: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            value = node.get("confidence")
            if isinstance(value, str):
                seen.add(value)
            for child in node.values():
                walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)

    walk(plan)
    allowed = {"estimate", "typical_range", "unverified"}
    chk("R1 confidence 유니온", bool(seen) and seen <= allowed, f"{sorted(seen)}")

    # ── R5 · S16: 좌표·예약 동선 금지 ───────────────────────────────────
    chk("R5 좌표 0건",
        not re.search(r"\b\d{2}\.\d{4,},\s*\d{2,3}\.\d{4,}", blob))
    chk("S16 URL 0건", "http://" not in blob and "https://" not in blob)
    chk("S16 전화번호 0건", not re.search(r"0\d{1,2}-\d{3,4}-\d{4}", blob))

    # ── 면책 · 구조 ─────────────────────────────────────────────────────
    degraded = plan["generation"].get("degraded", False)
    n_disc = len(plan["disclaimers"])
    chk("면책 개수", n_disc == (5 if degraded else 4),
        f"{n_disc} (degraded={degraded})")

    n_days = len(plan["days"])
    n_check = len(plan["checklist"]["items"])
    n_rainy = len(plan["rainyDay"]["alternatives"])
    chk("구조 최소치", n_days >= 1 and n_check >= 6 and n_rainy >= 2,
        f"days {n_days} · checklist {n_check} · rainy {n_rainy}")

    info("model", str(plan["generation"].get("model")))
    if degraded:
        info("degradedReasons", str(plan["generation"].get("degradedReasons")))

    return 1 if failures else 0


def _write_tally() -> None:
    """check-live.sh 가 합산할 수 있게 집계를 넘긴다.

    이걸 넘기지 않으면 요약의 PASS 수가 불변식 건수만큼 통째로 비어
    "7건 통과"처럼 보인다. 실제로 한 번 그렇게 나왔다.
    """
    path = os.environ.get("TALLY_FILE")
    if path:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(f"{passes} {failures}\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__.strip(), file=sys.stderr)
        sys.exit(2)
    try:
        code = main(sys.argv[1])
    except (KeyError, TypeError, ValueError) as exc:
        print(f"  {RED}FAIL{RESET}  {pad('응답 구조')}  {type(exc).__name__}: {exc}")
        failures += 1
        code = 1
    _write_tally()
    sys.exit(code)
