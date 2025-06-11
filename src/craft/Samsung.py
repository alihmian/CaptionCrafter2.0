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


def create_crypto_post(
    GALAXYS25ULTRA: str = "0",
    GALAXYS24ULTRA: str = "0",
    GALAXYS23ULTRA: str = "0",
    GALAXYS24FE: str = "0",
    GALAXYA56: str = "0",
    GALAXYA35: str = "0",
    GALAXYA16: str = "0",
    GALAXYA06: str = "0",
    output_path: str = "./OutPut/Samsung_output.jpeg",
) -> None:
    base_img = Image.open("Bases/Samsung.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)

    fonts = {
        "main": "./Fonts/AbarMid-SemiBold.ttf",
        "date": "./Fonts/AbarMid-Regular.ttf",
    }

    anchor = 774
    height = 650
    width = 150
    positions = {
        "GALAXYS25ULTRA": (anchor, height),
        "GALAXYS24ULTRA": (anchor, height + width),
        "GALAXYS23ULTRA": (anchor, height + 2 * width),
        "GALAXYS24FE": (anchor, height + 3 * width),
        "GALAXYA56": (anchor, height + 4 * width),
        "GALAXYA35": (anchor, height + 5 * width),
        "GALAXYA16": (anchor, height + 6 * width),
        "GALAXYA06": (anchor, height + 7 * width),
        "date": (base_img.width / 2, 495),
    }

    draw_text_no_box(
        draw,
        day_of_week() + " " + shamsi(year=True, month=True, day=True),
        fonts["date"],
        *positions["date"],
        alignment="center",
        font_size=60,
        is_rtl=DEFAULT_IS_RTL,
        color="white",
    )

    font_size = 50
    for key in [
        "GALAXYS25ULTRA",
        "GALAXYS24ULTRA",
        "GALAXYS23ULTRA",
        "GALAXYS24FE",
        "GALAXYA56",
        "GALAXYA35",
        "GALAXYA16",
        "GALAXYA06",
    ]:
        draw_text_no_box(
            draw,
            farsi_fmt(eval(key)),
            fonts["main"],
            *positions[key],
            alignment="center",
            font_size=font_size,
            is_rtl=DEFAULT_IS_RTL,
            color="white",
        )

    print("Generated Samsung image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


# if __name__ == "__main__":
#     create_crypto_post(
#         GALAXYS25ULTRA="382000000000",
#         GALAXYS24ULTRA="190000000",
#         GALAXYS23ULTRA="888888888888",
#         GALAXYS24FE="17000",
#         GALAXYA56="12000000",
#         GALAXYA35="6000000",
#         GALAXYA16="50000",
#         GALAXYA06="2000",
#         output_path="./OutPut/test_Samsung_output.jpeg",
#     )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a crypto price image.")
    parser.add_argument("--GALAXYS25ULTRA", type=str, default="0", help="Price of GALAXYS25ULTRA")
    parser.add_argument("--GALAXYS24ULTRA", type=str, default="0", help="Price of GALAXYS24ULTRA")
    parser.add_argument("--GALAXYS23ULTRA", type=str, default="0", help="Price of GALAXYS23ULTRA")
    parser.add_argument("--GALAXYS24FE", type=str, default="0", help="Price of GALAXYS24FE")
    parser.add_argument("--GALAXYA56", type=str, default="0", help="Price of Binance Coin")
    parser.add_argument("--GALAXYA35", type=str, default="0", help="Price of GALAXYA35")
    parser.add_argument("--GALAXYA16", type=str, default="0", help="Price of USD Coin")
    parser.add_argument("--GALAXYA06", type=str, default="0", help="Price of GALAXYA06")
    parser.add_argument("--output_path", type=str, required=True, help="Path to save the image")

    args = parser.parse_args()

    create_crypto_post(
        GALAXYS25ULTRA=args.GALAXYS25ULTRA,
        GALAXYS24ULTRA=args.GALAXYS24ULTRA,
        GALAXYS23ULTRA=args.GALAXYS23ULTRA,
        GALAXYS24FE=args.GALAXYS24FE,
        GALAXYA56=args.GALAXYA56,
        GALAXYA35=args.GALAXYA35,
        GALAXYA16=args.GALAXYA16,
        GALAXYA06=args.GALAXYA06,
        output_path=args.output_path,
    )
