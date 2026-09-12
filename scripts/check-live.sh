#!/usr/bin/env bash
#
# 배포된 사이트 점검 — docs/09_점검체크리스트.md §3 · §6
#
#   ./scripts/check-live.sh                      프로덕션 별칭 점검
#   ./scripts/check-live.sh https://<배포-URL>   특정 배포 점검
#   ./scripts/check-live.sh --full               불변식 검증(§6)까지
#   ./scripts/check-live.sh https://... --full
#
# 종료 코드: 0 = FAIL 없음 · 1 = FAIL 1건 이상
# WARN 은 종료 코드에 영향을 주지 않는다 — 사람이 판단할 항목이라는 뜻이다.
#
# SSO 로 보호된 동안에는 본문·정적자산이 게이트에 막혀 SKIP 으로 표시된다.
# 그 SKIP 자체가 "아직 비공개"라는 증거다. 공개 전환 후 다시 돌리면 실제 판정이 나온다.

set -uo pipefail

DEFAULT_BASE="https://tour-project-lac.vercel.app"
FONT_PATH="/fonts/PretendardVariable.subset.woff2"
FONT_MAX_BYTES=327680   # 320 KB — TRD 9장 폰트 예산
EXPECT_REGION="icn1"    # vercel.json 의 regions

BASE=""
FULL=0
for arg in "$@"; do
  case "$arg" in
    --full) FULL=1 ;;
    http*)  BASE="${arg%/}" ;;
    -h|--help) sed -n '2,19p' "$0" | sed 's/^#\{1,\} \{0,1\}//'; exit 0 ;;
    *) echo "알 수 없는 인자: $arg" >&2; exit 2 ;;
  esac
done
BASE="${BASE:-$DEFAULT_BASE}"

if [ -t 1 ]; then
  G=$'\033[32m'; R=$'\033[31m'; Y=$'\033[33m'; B=$'\033[2m'; N=$'\033[0m'
else
  G=""; R=""; Y=""; B=""; N=""
fi

command -v curl >/dev/null 2>&1 || { echo "필요한 명령 없음: curl" >&2; exit 2; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ── 한글 폭 정렬 ──────────────────────────────────────────────────────────
# printf '%-34s' 는 바이트를 센다. 한글은 3바이트 1문자 2칸이므로 정렬이 깨진다.
# 표시 폭 = 문자수 + (바이트수 - 문자수) / 2
#   ASCII  : 1바이트 1문자 → 보정 0  → 1칸
#   한글/CJK: 3바이트 1문자 → 보정 +1 → 2칸
# 로케일이 UTF-8 이 아니면 wc -m 이 wc -c 와 같아져 보정이 0이 된다(안전한 퇴화).
pad() {
  local s="$1" w="$2" b c disp n
  b=$(printf %s "$s" | LC_ALL=C wc -c | tr -d ' ')
  c=$(printf %s "$s" | wc -m | tr -d ' ')
  disp=$(( c + (b - c) / 2 ))
  printf %s "$s"
  n=$(( w - disp ))
  [ "$n" -gt 0 ] && printf '%*s' "$n" ''
}

pass_n=0; fail_n=0; warn_n=0; skip_n=0
LBL=30

ok()   { printf "  ${G}PASS${N}  %s  %s\n" "$(pad "$1" $LBL)" "${2-}"; pass_n=$((pass_n+1)); }
bad()  { printf "  ${R}FAIL${N}  %s  %s\n" "$(pad "$1" $LBL)" "${2-}"; fail_n=$((fail_n+1)); }
warn() { printf "  ${Y}WARN${N}  %s  %s\n" "$(pad "$1" $LBL)" "${2-}"; warn_n=$((warn_n+1)); }
skip() { printf "  ${B}SKIP${N}  %s  %s\n" "$(pad "$1" $LBL)" "${2-}"; skip_n=$((skip_n+1)); }
info() { printf "  ${B}INFO${N}  %s  %s\n" "$(pad "$1" $LBL)" "${2-}"; }
sect() { printf "\n${B}── %s${N}\n" "$1"; }

# 헤더 값 추출 (헤더명 대소문자 무시, CR 제거)
hval() { awk -v k="$(printf %s "$1" | tr 'A-Z' 'a-z')" \
  'BEGIN{IGNORECASE=1} { line=$0; sub(/\r$/,"",line);
     p=index(line,":"); if(p==0) next;
     name=tolower(substr(line,1,p-1)); gsub(/^ +| +$/,"",name);
     if(name==k){ v=substr(line,p+1); gsub(/^ +| +$/,"",v); print v } }' "$2"; }

echo "대상: $BASE"

# ═══════════════════════════════════════════════════════ 1. 접근 상태
sect "1. 접근 상태"

curl -sI "$BASE/" > "$TMP/head.txt" 2>/dev/null
root_code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")"
PROTECTED=0

case "$root_code" in
  302|307)
    if hval location "$TMP/head.txt" | grep -qi 'vercel.com/sso-api'; then
      PROTECTED=1
      ok "공개 노출" "302 → Vercel SSO (비공개 유지)"
    else
      warn "공개 노출" "$root_code — SSO 가 아닌 리다이렉트: $(hval location "$TMP/head.txt")"
    fi
    ;;
  200) warn "공개 노출" "200 — 공개 상태. 의도한 전환인지 확인할 것 (09 §4)" ;;
  *)   bad  "공개 노출" "$root_code — 예상 밖" ;;
esac

# ═══════════════════════════════════════════════════════ 2. 헤더
sect "2. 헤더"

if [ "$(grep -ci '^x-powered-by' "$TMP/head.txt")" -eq 0 ]; then
  ok "X-Powered-By 미노출" "0건"
else
  bad "X-Powered-By 미노출" "$(hval x-powered-by "$TMP/head.txt")"
fi

vid="$(hval x-vercel-id "$TMP/head.txt")"
region="${vid%%:*}"
if [ "$region" = "$EXPECT_REGION" ]; then
  ok "리전" "$region"
elif [ -n "$region" ]; then
  warn "리전" "$region — vercel.json 은 $EXPECT_REGION 을 지정한다"
else
  skip "리전" "x-vercel-id 없음"
fi

# 보안 헤더(G1). SSO 게이트 응답의 헤더는 Vercel 이 붙인 것이라
# 우리 앱의 설정을 반영하지 않는다 → 보호 중에는 판정하지 않는다.
if [ "$PROTECTED" = "1" ]; then
  skip "보안 헤더 4종" "SSO 게이트 응답이라 앱 설정을 반영하지 않음 → 09 §4 G1"
else
  miss=""
  for h in content-security-policy x-frame-options referrer-policy x-content-type-options; do
    grep -qi "^$h" "$TMP/head.txt" || miss="$miss $h"
  done
  if [ -z "$miss" ]; then
    ok "보안 헤더 4종" "전부 존재"
  else
    warn "보안 헤더 4종" "누락:$miss → 09 §4 G1"
  fi
fi

# ═══════════════════════════════════════════════════════ 3. 폰트
sect "3. 폰트 (R6 · TRD 9장)"

curl -sI "$BASE$FONT_PATH" > "$TMP/font.txt" 2>/dev/null
font_code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE$FONT_PATH")"

if [ "$PROTECTED" = "1" ] && [ "$font_code" != "200" ]; then
  skip "폰트" "$font_code — SSO 게이트. 로컬 검증: ls -l public/fonts/"
  if [ -f public/fonts/PretendardVariable.subset.woff2 ]; then
    lb=$(wc -c < public/fonts/PretendardVariable.subset.woff2 | tr -d ' ')
    if [ "$lb" -le "$FONT_MAX_BYTES" ]; then
      ok "폰트 크기 (로컬 파일)" "$lb B ≤ $FONT_MAX_BYTES"
    else
      bad "폰트 크기 (로컬 파일)" "$lb B > $FONT_MAX_BYTES"
    fi
  fi
elif [ "$font_code" = "200" ]; then
  fbytes="$(hval content-length "$TMP/font.txt")"; fbytes="${fbytes:-0}"
  if [ "$fbytes" -le "$FONT_MAX_BYTES" ] 2>/dev/null; then
    ok "폰트 크기" "$fbytes B ≤ $FONT_MAX_BYTES"
  else
    bad "폰트 크기" "$fbytes B > $FONT_MAX_BYTES"
  fi
  if hval cache-control "$TMP/font.txt" | grep -qi 'immutable'; then
    ok "폰트 캐시" "immutable"
  else
    bad "폰트 캐시" "immutable 없음 — next.config.ts headers() 확인"
  fi
  if hval content-type "$TMP/font.txt" | grep -qi 'font/woff2'; then
    ok "폰트 타입" "font/woff2"
  else
    warn "폰트 타입" "$(hval content-type "$TMP/font.txt")"
  fi
else
  bad "폰트 응답" "$font_code — 자체 호스팅이 깨졌다"
fi

# ═══════════════════════════════════════════════════════ 4. 서버 검증
sect "4. 서버 검증 (R3 · SEC4)"

api_code="$(curl -s -D "$TMP/err.hdr" -o "$TMP/err.json" -w '%{http_code}' \
  -X POST "$BASE/api/plan" -H 'Content-Type: application/json' -d '{}')"

RATELIMITED=0
if [ "$PROTECTED" = "1" ] && [ "$api_code" = "401" ]; then
  skip "빈 본문 → 422" "401 (SSO 보호 중) — 비공개의 증거"
  skip "오류 응답 위생" "동일"
elif [ "$api_code" = "429" ]; then
  # 이 스크립트를 연달아 돌리면 반드시 만난다 (5회 / 10분).
  # 429 는 결함이 아니라 lib/rate-limit.ts 가 살아 있다는 증거다.
  RATELIMITED=1
  ra="$(hval retry-after "$TMP/err.hdr")"
  ok "레이트리밋 동작" "429$([ -n "$ra" ] && echo " · Retry-After ${ra}s")"
  skip "빈 본문 → 422" "429 에 막힘 — $( [ -n "$ra" ] && echo "${ra}초" || echo "잠시" ) 후 재실행"
  skip "오류 응답 위생" "동일"
elif [ "$api_code" = "422" ]; then
  ok "빈 본문 → 422" "422"
  leak=""
  grep -qE '/(Users|vercel|var)/|\.tsx?:[0-9]+|at [A-Za-z_]+ \(' "$TMP/err.json" && leak="$leak 경로/스택"
  grep -qE '"(Required|Expected|Invalid|Too (small|big))' "$TMP/err.json" && leak="$leak 영문Zod"
  if [ -z "$leak" ]; then
    ok "오류 응답 위생" "스택·경로·영문 메시지 0건"
  else
    bad "오류 응답 위생" "누출:$leak"
  fi
  src="$(sed -n 's/.*"source": *"\([a-z]*\)".*/\1/p' "$TMP/err.json" | head -1)"
  [ -n "$src" ] && info "소스 모드" "$src$([ "$src" = mock ] && echo '  (GEMINI_API_KEY 미설정)')"
else
  bad "빈 본문 → 422" "$api_code"
fi

# ═══════════════════════════════════════════ 5. 불변식 (--full · 09 §6)
if [ "$FULL" = "1" ]; then
  sect "5. 불변식 (R1 · R5 · R8 · S16)"

  if [ "$PROTECTED" = "1" ]; then
    skip "정상 요청" "SSO 보호 중 — 공개 후 또는 로컬(pnpm start)에 대해 재실행"
  elif [ "$RATELIMITED" = "1" ]; then
    skip "정상 요청" "레이트리밋 창이 닫혀 있다 — 창이 열린 뒤 재실행"
  elif ! command -v python3 >/dev/null 2>&1; then
    skip "정상 요청" "python3 없음"
  else
    plan_code="$(curl -s -o "$TMP/plan.json" -w '%{http_code}' \
      -X POST "$BASE/api/plan" -H 'Content-Type: application/json' -d '{
        "destination":"제주도","startDate":"2026-10-03","endDate":"2026-10-05",
        "partySize":{"adults":2,"children":1,"infants":0},
        "budget":{"amount":900000,"currency":"KRW","scope":"total"},
        "styles":["healing","nature","photo"]}')"

    if [ "$plan_code" != "200" ]; then
      bad "정상 요청" "$plan_code"
    else
      ok "정상 요청" "200"
      TALLY_FILE="$TMP/tally" python3 "$(dirname "$0")/_assert_invariants.py" "$TMP/plan.json"
      # 집계를 합산한다. 넘겨받지 않으면 요약이 불변식 건수를 통째로 빠뜨린다.
      if [ -s "$TMP/tally" ]; then
        read -r t_pass t_fail < "$TMP/tally"
        pass_n=$((pass_n + t_pass)); fail_n=$((fail_n + t_fail))
      else
        bad "불변식 집계" "스크립트가 집계를 남기지 않았다"
      fi
    fi
  fi
fi

# ═══════════════════════════════════════════════════════ 결과
printf "\n${B}────────────────────────────────────────────${N}\n"
printf "PASS %d · FAIL %s%d%s · WARN %s%d%s · SKIP %d\n" \
  "$pass_n" "$([ "$fail_n" -gt 0 ] && printf %s "$R")" "$fail_n" "$N" \
  "$([ "$warn_n" -gt 0 ] && printf %s "$Y")" "$warn_n" "$N" "$skip_n"

if [ "$fail_n" -gt 0 ]; then
  echo "→ FAIL 을 먼저 해결할 것. 기준은 docs/09_점검체크리스트.md"
  exit 1
fi
[ "$warn_n" -gt 0 ] && echo "→ WARN 은 사람이 판단할 항목이다. docs/09_점검체크리스트.md §4 참조"
exit 0
