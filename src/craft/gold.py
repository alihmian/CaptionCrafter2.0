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


def create_gold_post(
    Gold: str = "0",
    Coin: str = "0",
    HalfCoin: str = "0",
    QuarterCoin: str = "0",
    Gold18: str = "0",
    Gold24: str = "0",
    output_path: str = "./OutPut/Gold_output.png",
) -> None:
    base_img = Image.open("Bases/Gold.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)

    fonts = {
        "main": "./Fonts/AbarMid-SemiBold.ttf",
        "date": "./Fonts/AbarMid-Regular.ttf",
    }

    anchor = 369
    height = 800
    width = 150
    positions = {
        "Gold": (anchor, height),
        "Coin": (anchor, height + width),
        "HalfCoin": (anchor, height + 2 * width),
        "QuarterCoin": (anchor, height + 3 * width),
        "Gold18": (anchor, height + 4 * width),
        "Gold24": (anchor, height + 5 * width),
        "date": (base_img.width / 2, 625),
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

    font_size = 65
    for key in ["Gold", "Coin", "HalfCoin", "QuarterCoin", "Gold18", "Gold24"]:
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

    print("Generated gold image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a gold prices image.")
    parser.add_argument("--Gold", type=str, default="0")
    parser.add_argument("--Coin", type=str, default="0")
    parser.add_argument("--HalfCoin", type=str, default="0")
    parser.add_argument("--QuarterCoin", type=str, default="0")
    parser.add_argument("--Gold18", type=str, default="0")
    parser.add_argument("--Gold24", type=str, default="0")
    parser.add_argument("--output_path", type=str, required=True)

    args = parser.parse_args()

    create_gold_post(
        Gold=args.Gold,
        Coin=args.Coin,
        HalfCoin=args.HalfCoin,
        QuarterCoin=args.QuarterCoin,
        Gold18=args.Gold18,
        Gold24=args.Gold24,
        output_path=args.output_path,
    )

# # python "./src/Craft/Post.py" --user_image_path="./UserImages/img.png" --overline_text="سوخت قاچاق در خليج فارس" --main_headline_text="كشف محموله عظيم سوخت قاچاق درخليج فارس؛ ضربه سنگين به قاچاقچيان" --output_path="./OutPut/Post_output.png" --events_text="رویداد "
