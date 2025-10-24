from PIL import Image, ImageDraw
from text_utils import draw_text_no_box, farsi_fmt
from date_util import shamsi, day_of_week
import argparse
from config import DEFAULT_IS_RTL


def create_crypto_post(
    REDMINOTE14: str = "0",
    REDMINOTE13: str = "0",
    XIAOMIXIAOMI14TPRO: str = "0",
    XIAOMI14T: str = "0",
    POCOF6PRO: str = "0",
    POCOX7PRO: str = "0",
    POCOM6PRO: str = "0",
    GALAXYA06: str = "0",
    output_path: str = "./OutPut/xiaomi_output.jpeg",
) -> None:
    base_img = Image.open("Bases/xiaomi.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)

    fonts = {
        "main": "./Fonts/AbarMid-SemiBold.ttf",
        "date": "./Fonts/AbarMid-Regular.ttf",
    }

    anchor = 774
    height = 730
    width = 150
    positions = {
        "REDMINOTE14": (anchor, height),
        "REDMINOTE13": (anchor, height + width),
        "XIAOMIXIAOMI14TPRO": (anchor, height + 2 * width),
        "XIAOMI14T": (anchor, height + 3 * width),
        "POCOF6PRO": (anchor, height + 4 * width),
        "POCOX7PRO": (anchor, height + 5 * width),
        "POCOM6PRO": (anchor, height + 6 * width),
        "GALAXYA06": (anchor, height + 7 * width),
        "date": (base_img.width / 2, 570),
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
        "REDMINOTE14",
        "REDMINOTE13",
        "XIAOMIXIAOMI14TPRO",
        "XIAOMI14T",
        "POCOF6PRO",
        "POCOX7PRO",
        "POCOM6PRO",
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

    print("Generated xiaomi image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


# if __name__ == "__main__":
#     create_crypto_post(
#         REDMINOTE14="382000000000",
#         REDMINOTE13="190000000",
#         XIAOMIXIAOMI14TPRO="888888889888",
#         XIAOMI14T="17000",
#         POCOF6PRO="12000000",
#         POCOX7PRO="6000000",
#         POCOM6PRO="50000",
#         GALAXYA06="0",
#         output_path="./OutPut/test_xiaomi_output.jpeg",
#     )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a crypto price image.")
    parser.add_argument(
        "--REDMINOTE14", type=str, default="0", help="Price of REDMINOTE14"
    )
    parser.add_argument(
        "--REDMINOTE13", type=str, default="0", help="Price of REDMINOTE13"
    )
    parser.add_argument(
        "--XIAOMIXIAOMI14TPRO",
        type=str,
        default="0",
        help="Price of XIAOMIXIAOMI14TPRO",
    )
    parser.add_argument("--XIAOMI14T", type=str, default="0", help="Price of XIAOMI14T")
    parser.add_argument(
        "--POCOF6PRO", type=str, default="0", help="Price of Binance Coin"
    )
    parser.add_argument("--POCOX7PRO", type=str, default="0", help="Price of POCOX7PRO")
    parser.add_argument("--POCOM6PRO", type=str, default="0", help="Price of USD Coin")
    parser.add_argument("--GALAXYA06", type=str, default="0", help="Price of GALAXYA06")
    parser.add_argument(
        "--output_path", type=str, required=True, help="Path to save the image"
    )

    args = parser.parse_args()

    create_crypto_post(
        REDMINOTE14=args.REDMINOTE14,
        REDMINOTE13=args.REDMINOTE13,
        XIAOMIXIAOMI14TPRO=args.XIAOMIXIAOMI14TPRO,
        XIAOMI14T=args.XIAOMI14T,
        POCOF6PRO=args.POCOF6PRO,
        POCOX7PRO=args.POCOX7PRO,
        POCOM6PRO=args.POCOM6PRO,
        GALAXYA06=args.GALAXYA06,
        output_path=args.output_path,
    )
