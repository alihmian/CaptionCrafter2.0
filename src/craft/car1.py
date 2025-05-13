from PIL import Image, ImageDraw
from text_utils import draw_text_no_box
from date_util import shamsi, day_of_week
import argparse
import re
from typing import Union

DEFAULT_IS_RTL: bool = False


def to_farsi_numerals(text: str) -> str:
    western_to_farsi = {
        "0": "۰",
        "1": "۱",
        "2": "۲",
        "3": "۳",
        "4": "۴",
        "5": "۵",
        "6": "۶",
        "7": "۷",
        "8": "۸",
        "9": "۹",
    }
    return "".join(western_to_farsi.get(ch, ch) for ch in text)


_persian2latin = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
_thousands_sep = "٫"  # U+066C  (looks right‑to‑left, unlike ‘,’)


def normalise_number(raw: str) -> int:
    """
    1) Bring every digit to Latin 0‑9
    2) Treat Persian decimal mark (٫) and ASCII dot as the SAME
    3) Throw away everything else
    4) If you still have >1 dot, the dots were thousands‑seps ⇒ drop them
    """
    s = raw.translate(_persian2latin)
    s = s.replace("٫", ".")
    # keep only digits or a dot
    s = re.sub(r"[^0-9.]", "", s)

    if s.count(".") > 1:  # they were thousands‑separators
        s = s.replace(".", "")
    return int(float(s))  # works even if user typed a decimal fraction


def farsi_fmt(num: Union[int, str]) -> str:
    """Return a nicely‑grouped Persian string such as ۸٬۵۶۸٬۰۷۴٬۳۰۰"""
    if isinstance(num, str):
        num = normalise_number(num)
    s = f"{num:,}".replace(",", _thousands_sep)  # add RTL comma
    return to_farsi_numerals(s)


def _parse_newline_numbers(raw_block: str, expected_count: int) -> list[int]:
    """
    Convert a newline-separated block of text
    → list of *int* (with Persian or Latin digits, thousands-seps ignored).

    Raises if the user gives too few / too many values.
    """
    # Normalise Persian digits, remove rtl decimal mark, commas, spaces …
    trans = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
    cleaned = [
        re.sub(r"[^\d]", "", line.translate(trans))
        for line in raw_block.strip().splitlines()
        if line.strip()
    ]
    if len(cleaned) != expected_count:
        raise ValueError(
            f"Expected {expected_count} numbers, got {len(cleaned)} "
            "(check line-breaks)."
        )
    return list(map(int, cleaned))


def create_car_post(
    prices_block: str,
    output_path: str = "./OutPut/Car_output.jpeg",
) -> None:
    """
    prices_block: 14 numbers   ⬇️ order per row
        factory₁, market₁
        factory₂, market₂
        … (7 rows total)

    Example block ( copy-paste into terminal with quotes )
    \"\"\"
    410,000,000
    528,000,000
    620,000,000
    690,000,000
    …
    \"\"\"
    """

    # ---- constants you might tweak once to hit pixel-perfect centring ----
    COL_FACTORY_X = 205  # middle column (قیمت کارخانه)
    COL_MARKET_X = 513  # left-most price column (قیمت بازار)
    TOP_Y = 880  # y of first price row
    STEP_Y = 132  # vertical distance row→row (PNG is 1080 × 1920)

    numbers = _parse_newline_numbers(prices_block, expected_count=14)

    base = Image.open("Bases/Car1.png").convert("RGBA")
    draw = ImageDraw.Draw(base)

    font_path = "./Fonts/AbarMid-SemiBold.ttf"
    FONT_SIZE = 50

    # positions for the 7×2 price cells
    for row in range(7):
        factory, market = numbers[2 * row : 2 * row + 2]

        draw_text_no_box(
            draw,
            farsi_fmt(factory),
            font_path,
            COL_FACTORY_X,
            TOP_Y + row * STEP_Y,
            alignment="center",
            font_size=FONT_SIZE,
            is_rtl=DEFAULT_IS_RTL,
            color="white",
        )
        draw_text_no_box(
            draw,
            farsi_fmt(market),
            font_path,
            COL_MARKET_X,
            TOP_Y + row * STEP_Y,
            alignment="center",
            font_size=FONT_SIZE,
            is_rtl=True,
            color="white",
        )

    # date stamp (unchanged)
    draw_text_no_box(
        draw,
        day_of_week() + " " + shamsi(year=True, month=True, day=True),
        "./Fonts/AbarMid-Regular.ttf",
        base.width / 2,
        550,
        alignment="center",
        font_size=60,
        is_rtl=DEFAULT_IS_RTL,
        color="white",
    )

    base.convert("RGB").save(output_path, format="JPEG", quality=95)
    print("Generated car-price image ➜", output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a car-price card.")
    parser.add_argument(
        "--prices",
        type=str,
        required=True,
        help="Paste *14* numbers, each on its own line: "
        "factory₁↵market₁↵factory₂↵market₂↵…",
    )
    parser.add_argument(
        "--output_path",
        type=str,
        required=True,
        help="Where to save the final JPEG.",
    )
    args = parser.parse_args()

    create_car_post(
        prices_block=args.prices,
        output_path=args.output_path,
    )
# python src/craft/car.py \
#   --prices $'410000000\n528000000\n620000000\n690000000\n730000000\n780000000\n850000000\n900000000\n960000000\n1020000000\n1090000000\n1180000000\n1260000000\n1350000000' \
#   --output_path ./OutPut/example_car.jpeg

