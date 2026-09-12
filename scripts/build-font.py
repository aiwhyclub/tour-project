#!/usr/bin/env python3
"""Pretendard 서브셋 생성 — 저작 시점 1회용 도구. 런타임 의존성이 아니다.

public/fonts/PretendardVariable.subset.woff2 는 302KB 짜리 바이너리다.
그 파일이 어디서 어떻게 나왔는지 재현할 수 없으면 R6(에셋 출처 추적)이
매니페스트에 적힌 문장으로만 남고 검증할 수 없게 된다. 이 스크립트가 그 재현 경로다.

실행:
    uvx --from "fonttools[woff,unicode,woff2]" --with brotli python scripts/build-font.py

왜 이렇게 만드는가 (실측, 2026-09-12):

  전체 가변 woff2 원본                      2,009.5 KB
  가변 400-800 · U+AC00-D7A3 전체(11,172자)  1,157.1 KB
  정적 400   · U+AC00-D7A3 전체              581.0 KB
  가변 400-800 · KS X 1001 2,350자            302.7 KB  <- 채택

  design/typography.md §1 은 "한글 완성형 2,350자"를 쓰면서 unicode-range 에는
  U+AC00-D7A3 를 적었다. 그 범위는 2,350자가 아니라 현대 한글 11,172자 전체다.
  둘을 같은 것으로 보고 서브셋하면 목표(320KB)의 3.6배가 나온다.

  weight 축은 45~930 전체가 아니라 실사용 구간 400~800 으로 좁힌다
  (400 normal · 500 medium · 600 semibold · 700 bold · 800 extrabold).

  정적 파일 여러 벌 대신 가변 1벌인 이유: 정적은 weight 당 ~164KB 라
  5벌이면 800KB 가 넘고 요청도 5회가 된다.

알려진 한계:
  - KS X 1001 밖의 희귀 음절(예: 힣)은 시스템 고딕으로 폴백된다.
    11,172자를 전부 넣으면 1,157KB 가 되므로 의도적으로 감수한다.
  - UI 가 쓰는 ⓘ(U+24D8) ▾(U+25BE) ☂(U+2602) 는 Pretendard 원본에도 없다.
    서브셋 범위와 무관하며 어떤 설정으로도 이 폰트로는 그릴 수 없다.
"""

import os
import subprocess
import sys
import tarfile
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import decompress
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'fonts' / 'PretendardVariable.subset.woff2'
LICENSE_OUT = ROOT / 'public' / 'fonts' / 'LICENSE.txt'
WORK = Path(os.environ.get('FONT_BUILD_DIR', '/tmp/pretendard-build'))

PACKAGE = 'pretendard'
VERSION = '1.3.9'
TARBALL = f'https://registry.npmjs.org/{PACKAGE}/-/{PACKAGE}-{VERSION}.tgz'
SIZE_LIMIT_KB = 320

# design/typography.md §1-1 의 범위 + 실제 UI 문구가 쓰는데 그 표에 빠져 있던 기호들
# (en/em dash, 말줄임표, 화살표, ○, ⚠, ✓). 빠뜨리면 그 글자만 시스템 폰트로 튄다.
BASE_RANGES = [
    'U+0020-007E', 'U+00A0-00FF', 'U+20A9',
    'U+2013-2014', 'U+2018-201D', 'U+2026',
    'U+2190', 'U+2192', 'U+25CB', 'U+26A0', 'U+2713',
    'U+3000-303F', 'U+1100-11FF',
]


def ks_x_1001_hangul() -> list[int]:
    """KS X 1001 완성형 한글 2,350자.

    encode('euc_kr') 로 판별하면 안 된다 — CPython 의 euc_kr 코덱은 CP949(UHC)
    확장까지 받아들여 11,172자가 전부 통과한다. 완성형 영역을 decode 해서 뽑는다.
    """
    out = []
    for lead in range(0xB0, 0xC9):
        for trail in range(0xA1, 0xFF):
            try:
                ch = bytes([lead, trail]).decode('euc_kr')
            except UnicodeDecodeError:
                continue
            if 0xAC00 <= ord(ch) <= 0xD7A3:
                out.append(ord(ch))
    return sorted(set(out))


def main() -> int:
    WORK.mkdir(parents=True, exist_ok=True)
    tgz = WORK / f'{PACKAGE}-{VERSION}.tgz'

    if not tgz.exists():
        print(f'내려받는 중: {TARBALL}')
        urllib.request.urlopen  # noqa: B018  (아래 urlretrieve 가 쓰는 경로를 명시)
        urllib.request.urlretrieve(TARBALL, tgz)

    with tarfile.open(tgz) as tar:
        for member in ('package/dist/web/variable/woff2/PretendardVariable.woff2',
                       'package/dist/LICENSE.txt'):
            tar.extract(member, WORK, filter='data')

    src_woff2 = WORK / 'package/dist/web/variable/woff2/PretendardVariable.woff2'
    full_ttf = WORK / 'full.ttf'
    decompress(str(src_woff2), str(full_ttf))

    narrowed = WORK / 'wght400-800.ttf'
    instanced = instancer.instantiateVariableFont(
        TTFont(str(full_ttf)), {'wght': (400, 400, 800)}, inplace=False
    )
    instanced.save(str(narrowed))

    hangul = ks_x_1001_hangul()
    if len(hangul) != 2350:
        print(f'한글 자수가 2350 이 아닙니다: {len(hangul)}', file=sys.stderr)
        return 1

    unicodes = WORK / 'unicodes.txt'
    unicodes.write_text(
        ','.join(BASE_RANGES) + ',' + ','.join(f'U+{c:04X}' for c in hangul)
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ['pyftsubset', str(narrowed), f'--output-file={OUT}',
         f'--unicodes-file={unicodes}', '--flavor=woff2'],
        check=True,
    )
    LICENSE_OUT.write_bytes((WORK / 'package/dist/LICENSE.txt').read_bytes())

    kb = OUT.stat().st_size / 1024
    cmap = TTFont(str(OUT)).getBestCmap()
    syllables = len([c for c in cmap if 0xAC00 <= c <= 0xD7A3])

    print(f'생성: {OUT.relative_to(ROOT)}')
    print(f'  크기       {kb:.1f} KB (한도 {SIZE_LIMIT_KB} KB, 여유 {SIZE_LIMIT_KB - kb:.1f} KB)')
    print(f'  코드포인트 {len(cmap)} (한글 {syllables})')

    if kb > SIZE_LIMIT_KB:
        print(f'한도 {SIZE_LIMIT_KB} KB 를 넘었습니다.', file=sys.stderr)
        return 1
    if syllables != 2350:
        print(f'한글 음절 수가 2350 이 아닙니다: {syllables}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
