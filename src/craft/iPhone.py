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
    IPHONE16PROMAX: str = "0",
    IPHONE16PRO: str = "0",
    IPHONE16NORMAL: str = "0",
    IPHONE15PROMAX: str = "0",
    IPHONE15PRO: str = "0",
    IPHONE14NORMAL: str = "0",
    IPHONE13PROMAX: str = "0",
    IPHONE13PRO: str = "0",
    output_path: str = "./OutPut/iPhone_output.jpeg",
) -> None:
    base_img = Image.open("Bases/iPhone.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)

    fonts = {
        "main": "./Fonts/AbarMid-SemiBold.ttf",
        "date": "./Fonts/AbarMid-Regular.ttf",
    }

    anchor = 774
    height = 650
    width = 150
    positions = {
        "IPHONE16PROMAX": (anchor, height),
        "IPHONE16PRO": (anchor, height + width),
        "IPHONE16NORMAL": (anchor, height + 2 * width),
        "IPHONE15PROMAX": (anchor, height + 3 * width),
        "IPHONE15PRO": (anchor, height + 4 * width),
        "IPHONE14NORMAL": (anchor, height + 5 * width),
        "IPHONE13PROMAX": (anchor, height + 6 * width),
        "IPHONE13PRO": (anchor, height + 7 * width),
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
        "IPHONE16PROMAX",
        "IPHONE16PRO",
        "IPHONE16NORMAL",
        "IPHONE15PROMAX",
        "IPHONE15PRO",
        "IPHONE14NORMAL",
        "IPHONE13PROMAX",
        "IPHONE13PRO",
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

    print("Generated iPhone image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


# if __name__ == "__main__":
#     create_crypto_post(
#         IPHONE16PROMAX="382000000000",
#         IPHONE16PRO="190000000",
#         IPHONE16NORMAL="888888888888",
#         IPHONE15PROMAX="17000",
#         IPHONE15PRO="12000000",
#         IPHONE14NORMAL="6000000",
#         IPHONE13PROMAX="50000",
#         IPHONE13PRO="2000",
#         output_path="./OutPut/test_iPhone_output.jpeg",
#     )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a crypto price image.")
    parser.add_argument("--IPHONE16PROMAX", type=str, default="0", help="Price of IPHONE16PROMAX")
    parser.add_argument("--IPHONE16PRO", type=str, default="0", help="Price of IPHONE16PRO")
    parser.add_argument("--IPHONE16NORMAL", type=str, default="0", help="Price of IPHONE16NORMAL")
    parser.add_argument("--IPHONE15PROMAX", type=str, default="0", help="Price of IPHONE15PROMAX")
    parser.add_argument("--IPHONE15PRO", type=str, default="0", help="Price of Binance Coin")
    parser.add_argument("--IPHONE14NORMAL", type=str, default="0", help="Price of IPHONE14NORMAL")
    parser.add_argument("--IPHONE13PROMAX", type=str, default="0", help="Price of USD Coin")
    parser.add_argument("--IPHONE13PRO", type=str, default="0", help="Price of IPHONE13PRO")
    parser.add_argument("--output_path", type=str, required=True, help="Path to save the image")

    args = parser.parse_args()

    create_crypto_post(
        IPHONE16PROMAX=args.IPHONE16PROMAX,
        IPHONE16PRO=args.IPHONE16PRO,
        IPHONE16NORMAL=args.IPHONE16NORMAL,
        IPHONE15PROMAX=args.IPHONE15PROMAX,
        IPHONE15PRO=args.IPHONE15PRO,
        IPHONE14NORMAL=args.IPHONE14NORMAL,
        IPHONE13PROMAX=args.IPHONE13PROMAX,
        IPHONE13PRO=args.IPHONE13PRO,
        output_path=args.output_path,
    )
