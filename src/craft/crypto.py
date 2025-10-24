from PIL import Image, ImageDraw
from text_utils import draw_text_no_box, farsi_fmt
from date_util import shamsi, day_of_week
import argparse
from config import DEFAULT_IS_RTL


def create_crypto_post(
    Bitcoin: str = "0",
    Ethereum: str = "0",
    Tether: str = "0",
    Ripple: str = "0",
    BinanceCoin: str = "0",
    Solana: str = "0",
    USD_Coin: str = "0",
    Dogecoin: str = "0",
    output_path: str = "./OutPut/Crypto_output.jpeg",
) -> None:
    base_img = Image.open("Bases/Crypto.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)

    fonts = {
        "main": "./Fonts/AbarMid-SemiBold.ttf",
        "date": "./Fonts/AbarMid-Regular.ttf",
    }

    anchor = 312
    height = 650
    width = 150
    positions = {
        "Bitcoin": (anchor, height),
        "Ethereum": (anchor, height + width),
        "Tether": (anchor, height + 2 * width),
        "Ripple": (anchor, height + 3 * width),
        "BinanceCoin": (anchor, height + 4 * width),
        "Solana": (anchor, height + 5 * width),
        "USD_Coin": (anchor, height + 6 * width),
        "Dogecoin": (anchor, height + 7 * width),
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
        "Bitcoin",
        "Ethereum",
        "Tether",
        "Ripple",
        "BinanceCoin",
        "Solana",
        "USD_Coin",
        "Dogecoin",
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

    print("Generated crypto image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


# if __name__ == "__main__":
#     create_crypto_post(
#         Bitcoin="382000000000",
#         Ethereum="190000000",
#         Tether="888888888888",
#         Ripple="17000",
#         BinanceCoin="12000000",
#         Solana="6000000",
#         USD_Coin="50000",
#         Dogecoin="2000",
#         output_path="./OutPut/test_crypto_output.jpeg"
#     )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a crypto price image.")
    parser.add_argument("--Bitcoin", type=str, default="0", help="Price of Bitcoin")
    parser.add_argument("--Ethereum", type=str, default="0", help="Price of Ethereum")
    parser.add_argument("--Tether", type=str, default="0", help="Price of Tether")
    parser.add_argument("--Ripple", type=str, default="0", help="Price of Ripple")
    parser.add_argument(
        "--BinanceCoin", type=str, default="0", help="Price of Binance Coin"
    )
    parser.add_argument("--Solana", type=str, default="0", help="Price of Solana")
    parser.add_argument("--USD_Coin", type=str, default="0", help="Price of USD Coin")
    parser.add_argument("--Dogecoin", type=str, default="0", help="Price of Dogecoin")
    parser.add_argument(
        "--output_path", type=str, required=True, help="Path to save the image"
    )

    args = parser.parse_args()

    create_crypto_post(
        Bitcoin=args.Bitcoin,
        Ethereum=args.Ethereum,
        Tether=args.Tether,
        Ripple=args.Ripple,
        BinanceCoin=args.BinanceCoin,
        Solana=args.Solana,
        USD_Coin=args.USD_Coin,
        Dogecoin=args.Dogecoin,
        output_path=args.output_path,
    )
