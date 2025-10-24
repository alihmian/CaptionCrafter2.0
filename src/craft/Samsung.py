from PIL import Image, ImageDraw
from text_utils import draw_text_no_box, farsi_fmt
from date_util import shamsi, day_of_week
import argparse
import re
from typing import Union
from config import DEFAULT_IS_RTL



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
#         GALAXYS23ULTRA="888888988888",
#         GALAXYS24FE="17000",
#         GALAXYA56="12000000",
#         GALAXYA35="6000000",
#         GALAXYA16="50000",
#         GALAXYA06="2000",
#         output_path="./OutPut/test_Samsung_output.jpeg",
#     )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a crypto price image.")
    parser.add_argument(
        "--GALAXYS25ULTRA", type=str, default="0", help="Price of GALAXYS25ULTRA"
    )
    parser.add_argument(
        "--GALAXYS24ULTRA", type=str, default="0", help="Price of GALAXYS24ULTRA"
    )
    parser.add_argument(
        "--GALAXYS23ULTRA", type=str, default="0", help="Price of GALAXYS23ULTRA"
    )
    parser.add_argument(
        "--GALAXYS24FE", type=str, default="0", help="Price of GALAXYS24FE"
    )
    parser.add_argument(
        "--GALAXYA56", type=str, default="0", help="Price of Binance Coin"
    )
    parser.add_argument("--GALAXYA35", type=str, default="0", help="Price of GALAXYA35")
    parser.add_argument("--GALAXYA16", type=str, default="0", help="Price of USD Coin")
    parser.add_argument("--GALAXYA06", type=str, default="0", help="Price of GALAXYA06")
    parser.add_argument(
        "--output_path", type=str, required=True, help="Path to save the image"
    )

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
