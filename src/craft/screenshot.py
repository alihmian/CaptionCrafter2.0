from PIL import Image, ImageDraw, ImageOps
from text_utils import draw_text_no_box, draw_text_in_box
import argparse

DEFAULT_IS_RTL: bool = False


def create_newspaper_image(
    user_image_path: str,
    overline_text: str,
    main_headline_text: str,
    source_text: str,
    output_path: str,
    dynamic_font_size: bool = True,
    overline_font_size_delta: int = 0,
    main_headline_font_size_delta: int = 0,
) -> None:

    # Load the base template and compose it with the user image and event overlays.
    base_img = Image.open("Bases/Screenshot.png").convert("RGBA")
    draw = ImageDraw.Draw(base_img)

    # Load and paste user image.

    # --- white-box coordinates taken from the template ---
    box_left, box_top = 81, 672
    box_right = base_img.width - box_left
    box_bottom = 1263
    box_w, box_h = box_right - box_left, box_bottom - box_top
    margin = 40

    # open the user image
    user_img = Image.open(user_image_path).convert("RGBA")

    # resize (only if larger) but keep aspect ratio
    user_img = ImageOps.contain(
        user_img, (box_w - margin, box_h - margin), Image.LANCZOS
    )

    # centre it inside the white box
    paste_x = box_left + (box_w - user_img.width) // 2
    paste_y = box_top + (box_h - user_img.height) // 2

    # paste (use the image itself as the mask to keep transparency)
    base_img.paste(user_img, (paste_x, paste_y), user_img)

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

    # Add overline text.
    overline_size = 42 + overline_font_size_delta
    draw_text_no_box(
        draw,
        overline_text,
        fonts["overline"],
        base_img.width / 2,
        320,
        alignment="center",
        font_size=overline_size,
        color="black",
        is_rtl=False,
    )

    # Add source text.
    draw_text_no_box(
        draw,
        "source: " + source_text,
        fonts["overline"],
        box_left,
        box_top - 40,
        alignment="left",
        font_size=25,
        color=(155, 155, 153),
        is_rtl=not DEFAULT_IS_RTL,
    )

    # Add main headline text.
    margin = 110
    headline_box = (margin, 430, base_img.width - 2 * margin, 200)
    headline_size = 60 + main_headline_font_size_delta
    draw_text_in_box(
        draw,
        main_headline_text,
        fonts["headline"],
        headline_box,
        alignment="center",
        vertical_mode="top_to_bottom",
        auto_size=True,
        font_size=headline_size,
        color="black",
        is_rtl=DEFAULT_IS_RTL,
        line_spacing=1.4,
    )


    # Save the final image.
    print("python code log: created news paper image.")
    base_img.convert("RGB").save(output_path, format="JPEG", quality=95)


# if __name__ == "__main__":
# Example usage in non-composed mode (function does full composition)
# create_newspaper_image(
#     user_image_path="UserImages/img.png",
#     overline_text="سوخت قاچاق در خليج فارس",
#     main_headline_text= "تحریم‌های اقتصادی آمریکا علیه  و ملت ایران بسیار ظالمانه است",
#     source_text="BoJack Horseman",
#     output_path="./OutPut/BreakingNews_output.png",
#     dynamic_font_size=True
# )

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
    parser.add_argument("--source_text", type=str, required=True, help="The source text.")
    parser.add_argument(
        "--output_path", type=str, required=True, help="Path to save the final image."
    )
    parser.add_argument(
        "--dynamic_font_size", action="store_true", help="Enable dynamic font sizing."
    )
    parser.add_argument(
        "--overline_font_size_delta",
        type=int,
        default=0,
        help="Overline font size adjustment.",
    )
    parser.add_argument(
        "--main_headline_font_size_delta",
        type=int,
        default=0,
        help="Headline font size adjustment.",
    )

    args = parser.parse_args()

    create_newspaper_image(
        user_image_path=args.user_image_path,
        overline_text=args.overline_text,
        main_headline_text=args.main_headline_text,
        source_text=args.source_text,
        output_path=args.output_path,
        dynamic_font_size=args.dynamic_font_size,
        overline_font_size_delta=args.overline_font_size_delta,
        main_headline_font_size_delta=args.main_headline_font_size_delta,
    )

# python "./src/Craft/screenshot_template.py" --user_image_path="./assets/user_image.jpg" --overline_text="سوخت قاچاق در خليج فارس" --main_headline_text="كشف محموله عظيم سوخت قاچاق درخليج فارس؛ ضربه سنگين به قاچاقچيان" --output_path="assets/OutPut/

# python src/Craft/screenshot.py \
#   --user_image_path UserImages/img.png \
#   --overline_text "سوخت قاچاق در خلیج فارس" \
#   --main_headline_text "تحریم‌های اقتصادی آمریکا علیه دولت و ملت ایران بسیار ظالمانه است" \
#   --source "BoJack Horseman" \
#   --output_path output/scree2nshot.jpg \
