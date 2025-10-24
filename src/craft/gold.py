from PIL import Image, ImageDraw
from text_utils import draw_text_no_box, farsi_fmt
from date_util import shamsi, day_of_week
import argparse
from config import DEFAULT_IS_RTL


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
