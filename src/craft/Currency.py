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
_thousands_sep  = "٫"        # U+066C  (looks right‑to‑left, unlike ‘,’)

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

    if s.count(".") > 1:          # they were thousands‑separators
        s = s.replace(".", "")
    return int(float(s))          # works even if user typed a decimal fraction

def farsi_fmt(num: Union[int, str]) -> str:
    """Return a nicely‑grouped Persian string such as ۸٬۵۶۸٬۰۷۴٬۳۰۰"""
    if isinstance(num, str):
        num = normalise_number(num)
    s = f"{num:,}".replace(",", _thousands_sep)     # add RTL comma
    return to_farsi_numerals(s)


def create_currency_post(
    Dollar: str = "0",
    Euro: str = "0",
    Lira: str = "0",
    Dinar: str = "0",
    Dirham: str = "0",
    ChineseYuan: str = "0",
    SaudiRiyal: str = "0",
    output_path: str = "./OutPut/Currency_output.png",
) -> None:

    # Load the base template and compose it with the user image and event overlays.
    base_img = Image.open("Bases/Currency.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)
    draw = ImageDraw.Draw(base_img)

    # Define individual font paths.
    fonts = {
        "currency": "./Fonts/AbarMid-SemiBold.ttf",
        "date": "./Fonts/AbarMid-Regular.ttf",
    }

    # Define positions for dates.
    anchor = 369
    height = 730
    width = 150
    positions = {
        "Dollar": (anchor, height),
        "Euro": (anchor, height + width),
        "Lira": (anchor, height + 2 * width),
        "Dinar": (anchor, height + 3 * width),
        "Dirham": (anchor, height + 4 * width),
        "ChineseYuan": (anchor, height + 5 * width),
        "SaudiRiyal": (anchor, height + 6 * width),
        "date": (base_img.width / 2, 550),
    }

    draw_text_no_box(
        draw,
        day_of_week() + " " + shamsi(year=True, month=True, day=True),
        fonts["date"],
        *positions["date"],
        alignment="center",
        font_size=60,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )

    currencyFontSize = 65
    draw_text_no_box(
        draw,
        farsi_fmt(Dollar).replace(".","٫"),
        fonts["currency"],
        *positions["Dollar"],
        alignment="center",
        font_size=currencyFontSize,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )
    draw_text_no_box(
        draw,
        farsi_fmt(Euro),
        fonts["currency"],
        *positions["Euro"],
        alignment="center",
        font_size=currencyFontSize,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )
    draw_text_no_box(
        draw,
        farsi_fmt(Lira),
        fonts["currency"],
        *positions["Lira"],
        alignment="center",
        font_size=currencyFontSize,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )
    draw_text_no_box(
        draw,
        farsi_fmt(Dinar),
        fonts["currency"],
        *positions["Dinar"],
        alignment="center",
        font_size=currencyFontSize,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )
    draw_text_no_box(
        draw,
        farsi_fmt(Dirham),
        fonts["currency"],
        *positions["Dirham"],
        alignment="center",
        font_size=currencyFontSize,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )
    draw_text_no_box(
        draw,
        farsi_fmt(ChineseYuan),
        fonts["currency"],
        *positions["ChineseYuan"],
        alignment="center",
        font_size=currencyFontSize,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )
    draw_text_no_box(
        draw,
        farsi_fmt(SaudiRiyal),
        fonts["currency"],
        *positions["SaudiRiyal"],
        alignment="center",
        font_size=currencyFontSize,
        is_rtl=DEFAULT_IS_RTL,
        color="white"
    )

    # Save the final image.
    print("python code log: created news paper image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


if __name__ == "__main__":
    # Example usage: pass custom currency values with more zeros and specify an output path.
    create_currency_post(
        Dollar="10000000",
        Euro="8500000",
        Lira="7500000",
        Dinar="5000000",
        Dirham="6000000",
        ChineseYuan="9500000",
        SaudiRiyal="11000000",
        output_path="./OutPut/Currency_example.jpeg",
    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate a currency-style image with text overlays."
    )
    parser.add_argument(
        "--Dollar", type=str, default="0", help="Dollar currency value."
    )
    parser.add_argument(
        "--Euro", type=str, default="0", help="Euro currency value."
    )
    parser.add_argument(
        "--Lira", type=str, default="0", help="Lira currency value."
    )
    parser.add_argument(
        "--Dinar", type=str, default="0", help="Dinar currency value."
    )
    parser.add_argument(
        "--Dirham", type=str, default="0", help="Dirham currency value."
    )
    parser.add_argument(
        "--ChineseYuan", type=str, default="0", help="Chinese Yuan currency value."
    )
    parser.add_argument(
        "--SaudiRiyal", type=str, default="0", help="Saudi Riyal currency value."
    )
    parser.add_argument(
        "--output_path", type=str, required=True, help="Path to save the final image."
    )

    args = parser.parse_args()

    create_currency_post(
        Dollar=args.Dollar,
        Euro=args.Euro,
        Lira=args.Lira,
        Dinar=args.Dinar,
        Dirham=args.Dirham,
        ChineseYuan=args.ChineseYuan,
        SaudiRiyal=args.SaudiRiyal,
        output_path=args.output_path,
    )

# # python "./src/Craft/Post.py" --user_image_path="./UserImages/img.png" --overline_text="سوخت قاچاق در خليج فارس" --main_headline_text="كشف محموله عظيم سوخت قاچاق درخليج فارس؛ ضربه سنگين به قاچاقچيان" --output_path="./OutPut/Post_output.png" --events_text="رویداد "
