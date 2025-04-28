from PIL import Image, ImageDraw
from text_utils import draw_text_no_box, draw_text_in_box
from date_util import shamsi, arabic, georgian, day_of_week, clock_time
import argparse

DEFAULT_IS_RTL: bool = False


def create_newspaper_image(
    user_image_path: str,
    overline_text: str,
    main_headline_text: str,
    output_path: str,
    dynamic_font_size: bool = True,
    overline_font_size_delta: int = 0,
    main_headline_font_size_delta: int = 0,
    days_into_future = 0,
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
        "time": "./Fonts/Time-Normal.ttf"
    }

    # Add overline text.
    overline_size = 42 + overline_font_size_delta
    draw_text_no_box(
        draw,
        overline_text,
        fonts["overline"],
        base_img.width // 2,
        420,
        alignment="center",
        font_size=overline_size,
        color="white",
        is_rtl=False,
    )

    # Add main headline text.
    margin = 80
    headline_box = (margin, 500, base_img.width - 2 * margin, 210)
    headline_size = 60 + main_headline_font_size_delta
    draw_text_in_box(
        draw,
        main_headline_text,
        fonts["headline"],
        headline_box,
        alignment="center",
        vertical_mode="top_to_bottom",
        auto_size=dynamic_font_size,
        font_size=headline_size,
        color="white",
        is_rtl=False,
        line_spacing=1.2
    )


    # Define positions for dates.
    y_anchor = 329
    positions = {
        "weekday": (10, y_anchor),
        "persian_date": (base_img.width-80, y_anchor),
        "arabic_date": (base_img.width/2 , y_anchor),
        "english_date": (80, y_anchor),
        "time": (195, 240)
    }
    date_font_size = 25
    date_color = (160, 128, 128)
    # Draw date texts.


    draw_text_no_box(
        draw,
        arabic(year=True, month=True, day=True, days_into_future=days_into_future),
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
        color=date_color
    )
    draw_text_no_box(
        draw,
         day_of_week(days_into_future=days_into_future) + " " +shamsi(year=True, month=True, day=True) ,
        fonts["persian_date"],
        *positions["persian_date"],
        alignment="right",
        font_size=date_font_size,
        is_rtl=DEFAULT_IS_RTL,
        color=(209, 128, 128)
    )
    draw_text_no_box(
        draw,
        clock_time(show_hours=True, show_minutes=True, language="english"),
        fonts["time"],
        *positions["time"],
        alignment="center",
        color="white",
        font_size=45,
        is_rtl=DEFAULT_IS_RTL
    )


    # Save the final image.
    print("python code log: created news paper image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


if __name__ == "__main__":
    # Example usage in non-composed mode (function does full composition)
    create_newspaper_image(
        user_image_path="UserImages/img.png",
        overline_text="سوخت قاچاق در خليج فارس",
        main_headline_text= "ترامپ با سفر به تهران با آقاى پزشكيان ديدار مى كند",
        output_path="./OutPut/BreakingNews_output.png",
        dynamic_font_size=True
    )

# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(
#         description="Generate a newspaper-style image with text overlays and optional watermark."
#     )
#     parser.add_argument(
#         "--user_image_path",
#         type=str,
#         required=True,
#         help="Path to the user image or pre-composed base image.",
#     )
#     parser.add_argument(
#         "--overline_text", type=str, required=True, help="The overline text."
#     )
#     parser.add_argument(
#         "--main_headline_text", type=str, required=True, help="The main headline text."
#     )
#     parser.add_argument(
#         "--output_path", type=str, required=True, help="Path to save the final image."
#     )
#     parser.add_argument(
#         "--days_into_future",
#         type=int,
#         default=0,
#         help="Days offset for the displayed date.",
#     )
#     parser.add_argument(
#         "--overline_font_size_delta",
#         type=int,
#         default=0,
#         help="Overline font size adjustment.",
#     )
#     parser.add_argument(
#         "--main_headline_font_size_delta",
#         type=int,
#         default=0,
#         help="Headline font size adjustment.",
#     )
#     parser.add_argument(
#         "--dynamic_font_size", action="store_true", help="Enable dynamic font sizing."
#     )
#     parser.add_argument(
#         "--watermark", action="store_true", help="Apply watermark on the final image."
#     )
#     parser.add_argument(
#         "--composed",
#         action="store_true",
#         help="Indicate that the provided image is already composed.",
#     )
#     parser.add_argument(
#         "--event1_text", type=str, default=None, help="Optional text for event 1."
#     )
#     parser.add_argument(
#         "--event2_text", type=str, default=None, help="Optional text for event 2."
#     )
#     parser.add_argument(
#         "--event3_text", type=str, default=None, help="Optional text for event 3."
#     )

#     args = parser.parse_args()

#     create_newspaper_image(
#         user_image_path=args.user_image_path,
#         overline_text=args.overline_text,
#         main_headline_text=args.main_headline_text,
#         output_path=args.output_path,
#         days_into_future=args.days_into_future,
#         overline_font_size_delta=args.overline_font_size_delta,
#         main_headline_font_size_delta=args.main_headline_font_size_delta,
#         dynamic_font_size=args.dynamic_font_size,
#         watermark=args.watermark,
#         composed=args.composed,
#         event1_text=args.event1_text,
#         event2_text=args.event2_text,
#         event3_text=args.event3_text,
#     )

# # python "./src/Craft/newspaper_template.py" --user_image_path="./assets/user_image.jpg" --overline_text="سوخت قاچاق در خليج فارس" --main_headline_text="كشف محموله عظيم سوخت قاچاق درخليج فارس؛ ضربه سنگين به قاچاقچيان" --output_path="assets/OutPut/newspaper_output.png" --event2_text="رویداد دو"  --dynamic_font_size --watermark --composed
