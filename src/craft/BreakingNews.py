from PIL import Image, ImageDraw
from text_utils import draw_text_no_box, draw_text_in_box
from date_util import shamsi, georgian, day_of_week, clock_time, arabic
from config import arabic_days_into_future, DEFAULT_IS_RTL
import argparse



def create_newspaper_image(
    user_image_path: str,
    overline_text: str,
    main_headline_text: str,
    output_path: str,
    dynamic_font_size: bool = True,
    overline_font_size_delta: int = 0,
    main_headline_font_size_delta: int = 0,
    days_into_future=0,
    events_text="",
) -> None:

    # Load the base template and compose it with the user image and event overlays.
    base_img = Image.open("Bases/BreakingNews.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)

    # Load and paste user image.
    user_img = Image.open(user_image_path).convert("RGBA")
    alpha = 58
    user_img_resized = user_img.resize((16 * alpha, 9 * alpha))
    base_img.paste(user_img_resized, (80, 747), user_img_resized)

    draw = ImageDraw.Draw(base_img)

    # Define individual font paths.
    fonts = {
        "overline": "./Fonts/AbarLow-Regular.ttf",
        "headline": "./Fonts/AbarLow-Black.ttf",
        "arabic_date": "./Fonts/AbarLow-Regular.ttf",
        "english_date": "./Fonts/AbarLow-Regular.ttf",
        "persian_date": "./Fonts/AbarLow-Regular.ttf",
        "weekday": "./Fonts/AbarLow-Regular.ttf",
        "time": "./Fonts/Time-Normal.ttf",
    }
    # Add main headline text.
    margin = 81

    x_shift = 5
    Overline = "".join(c for c in overline_text if not c.isspace())
    Events = "".join(c for c in events_text if not c.isspace())

    if Overline and Events:  # ✅
        headline_box = (margin, 545 + x_shift, base_img.width - 2 * margin, 160)
        verticalMode = "top_to_bottom"
        overline_box = (margin, 445, base_img.width - 2 * margin, 80)
        overline_height = 440

    elif not Overline and Events:
        headline_box = (margin, 440 + x_shift, base_img.width - 2 * margin, 270)
        verticalMode = "center_expanded"
        overline_box = (margin, 445, base_img.width - 2 * margin, 80)

    elif Overline and not Events:  # ✅
        headline_box = (margin, 522 + x_shift, base_img.width - 2 * margin, 183)
        verticalMode = "top_to_bottom"
        overline_box = (margin, 420, base_img.width - 2 * margin, 80)

    else:  # ✅
        headline_box = (margin, 440 + x_shift, base_img.width - 2 * margin, 260)
        verticalMode = "center_expanded"
        overline_box = (margin, 445, base_img.width - 2 * margin, 80)

    headline_size = 60 + main_headline_font_size_delta
    draw_text_in_box(
        draw,
        main_headline_text,
        fonts["headline"],
        headline_box,
        alignment="center",
        vertical_mode=verticalMode,
        auto_size=True,
        font_size=headline_size,
        color="white",
        is_rtl=False,
        line_spacing=1.5,
        max_font_size=55,
    )

    draw_text_in_box(
        draw,
        overline_text,
        fonts["overline"],
        overline_box,
        alignment="center",
        vertical_mode="center_expanded",
        auto_size=True,
        max_font_size=45,
        color="white",
        is_rtl=DEFAULT_IS_RTL,
        line_spacing=1.5,
    )

    # Define positions for dates.
    y_anchor = 329
    positions = {
        "weekday": (10, y_anchor),
        "persian_date": (base_img.width - 80, y_anchor),
        "arabic_date": (base_img.width / 2, y_anchor),
        "english_date": (80, y_anchor),
        "time": (195, 240),
    }
    date_font_size = 25
    # date_color = (160, 128, 128)
    date_color = "white"

    # Draw date texts.

    draw_text_no_box(
        draw,
        arabic(
            year=True,
            month=True,
            day=True,
            days_into_future=arabic_days_into_future,
            language="arabic",
        ),
        fonts["arabic_date"],
        *positions["arabic_date"],
        alignment="center",
        font_size=date_font_size,
        is_rtl=DEFAULT_IS_RTL,
        color=date_color,
    )
    draw_text_no_box(
        draw,
        georgian(year=True, month=True, day=True, days_into_future=days_into_future),
        fonts["english_date"],
        *positions["english_date"],
        alignment="left",
        font_size=date_font_size,
        color=date_color,
    )
    draw_text_no_box(
        draw,
        day_of_week(days_into_future=days_into_future)
        + " "
        + shamsi(year=True, month=True, day=True),
        fonts["persian_date"],
        *positions["persian_date"],
        alignment="right",
        font_size=date_font_size,
        is_rtl=DEFAULT_IS_RTL,
        color=date_color,
        # color=(209, 128, 128),
    )
    draw_text_no_box(
        draw,
        clock_time(show_hours=True, show_minutes=True, language="english"),
        fonts["time"],
        *positions["time"],
        alignment="center",
        color="white",
        font_size=45,
        is_rtl=DEFAULT_IS_RTL,
    )

    # Save the final image.
    print("python code log: created news paper image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


# if __name__ == "__main__":
#     # Example usage in non-composed mode (function does full composition)
#     create_newspaper_image(
#         user_image_path="UserImages/img.png",
#         overline_text="سوختوخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فار قاچاق در خليج فارس",
#         main_headline_text="ترامپ با سفر به تهران باوخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فاروخت قاچاق در خليج فار آقاى پزشكيان ديدار مى كند",
#         output_path="./OutPut/BreakingNews_output.png",
#         dynamic_font_size=True,
#     )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate a newspaper-style image with text overlays and optional watermark."
    )
    parser.add_argument(
        "--user_image_path",
        type=str,
        required=True,
        help="Path to the user image or pre-composed base image.",
    )
    parser.add_argument(
        "--overline_text", type=str, required=True, help="The overline text."
    )
    parser.add_argument(
        "--main_headline_text", type=str, required=True, help="The main headline text."
    )
    parser.add_argument(
        "--output_path", type=str, required=True, help="Path to save the final image."
    )

    parser.add_argument(
        "--events_text", type=str, default=None, help="Optional text for event 1."
    )

    args = parser.parse_args()

    create_newspaper_image(
        user_image_path=args.user_image_path,
        overline_text=args.overline_text,
        main_headline_text=args.main_headline_text,
        output_path=args.output_path,
        events_text=args.events_text,
    )
