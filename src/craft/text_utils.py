# text_utils.py

# External dependencies required:
# - Pillow:          pip install Pillow
# - arabic-reshaper: pip install arabic-reshaper
# - python-bidi:     pip install python-bidi


from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
from typing import List, Tuple, Optional, Union
import re


# Default configuration constants
DEFAULT_COLOR: Union[str, Tuple[int, int, int]] = "black"
DEFAULT_FONT_SIZE: int = 24
DEFAULT_LINE_SPACING: float = 1.0
DEFAULT_MAX_FONT_SIZE: int = 55
DEFAULT_MIN_FONT_SIZE: int = 5
DEFAULT_IS_RTL: bool = True


def create_temporary_draw(width: int, height: int) -> ImageDraw.ImageDraw:
    """
    Creates a temporary ImageDraw instance for text measurement.
    """
    temp_img = Image.new("RGB", (width, height))
    return ImageDraw.Draw(temp_img)


def prepare_farsi_text(text: str) -> str:
    """
    Prepares Farsi (RTL) text for correct rendering.

    Args:
        text (str): Original Farsi text.

    Returns:
        str: Properly shaped and bidi-handled text ready for rendering.
    """
    reshaped_text = arabic_reshaper.reshape(text)
    bidi_text = get_display(reshaped_text)
    return bidi_text


def wrap_text_to_fit(
    text: str, font: ImageFont.FreeTypeFont, box_width: int, draw: ImageDraw.ImageDraw
) -> List[str]:
    """
    Splits text into multiple lines to fit within a given pixel width.

    Args:
        text (str): Prepared RTL or normal text to wrap.
        font (ImageFont.FreeTypeFont): Font object to measure text.
        box_width (int): Pixel width of the bounding box.
        draw (ImageDraw.ImageDraw): Draw object for measuring text size.

    Returns:
        list[str]: List of lines wrapped to fit the given width.
    """
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        # Tentatively append word to the current line
        test_line = f"{current_line} {word}".strip() if current_line else word
        left, _, right, _ = draw.textbbox(
            (0, 0), prepare_farsi_text(test_line), font=font
        )
        line_width = right - left

        if line_width <= box_width:
            current_line = test_line
        else:
            if current_line:  # If the line has content, push to lines
                lines.append(current_line)
            current_line = word  # start new line with current word

    if current_line:  # Add the last line if not empty
        lines.append(current_line)

    return lines


def calculate_font_size_to_fit(
    text: str,
    font_path: str,
    box_width: int,
    box_height: int,
    max_font_size: int = DEFAULT_MAX_FONT_SIZE,
    min_font_size: int = DEFAULT_MIN_FONT_SIZE,
    line_spacing: float = DEFAULT_LINE_SPACING,
) -> int:
    """
    Determines the largest possible font size that fits the given text within specified box dimensions.

    Args:
        text (str): Original text (RTL or LTR).
        font_path (str): Path to the TrueType/OpenType font file.
        box_width (int): Width of the bounding box in pixels.
        box_height (int): Height of the bounding box in pixels.
        max_font_size (int): Largest font size to attempt.
        min_font_size (int): Smallest allowable font size.
        line_spacing (float): Line spacing multiplier. Default is 1.0 (normal spacing).
        is_rtl (bool): Indicates if text is right-to-left (e.g., Farsi). Default is True.

    Returns:
        int: Optimal font size that allows the text to fit within the box. Returns min_font_size if none fit.

    Example:
        optimal_size = calculate_font_size_to_fit("text", "font.ttf", 400, 200, 48, 12)
    """
    # Temporary image and draw object for measurements
    draw = create_temporary_draw(box_width, box_height)

    # Start from max font size and decrement to min font size
    for font_size in range(max_font_size, min_font_size - 1, -1):
        # Create font object with current font size
        font = ImageFont.truetype(
            font_path, font_size, layout_engine=ImageFont.Layout.RAQM
        )

        # Wrap text to fit box width
        lines = wrap_text_to_fit(text, font, box_width, draw)

        # Measure total text height (with line spacing)
        total_height = 0
        max_line_width = 0
        for line in lines:
            left, top, right, bottom = draw.textbbox((0, 0), line, font=font)
            line_width = right - left
            line_height = bottom - top

            max_line_width = max(max_line_width, line_width)
            total_height += line_height * line_spacing

        # Adjust total height by removing extra spacing after last line
        total_height -= (line_spacing - 1.0) * line_height

        # Check if dimensions fit inside box constraints
        if total_height <= box_height and max_line_width <= box_width:
            return font_size  # Found suitable font size

    # If no suitable size found, return the minimum font size
    return min_font_size


def draw_text_in_box(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_path: str,
    box: Tuple[int, int, int, int],
    alignment: str = "center",
    vertical_mode: str = "center_expanded",
    auto_size: bool = False,
    color: Union[str, Tuple[int, int, int]] = DEFAULT_COLOR,
    line_spacing: float = DEFAULT_LINE_SPACING,
    max_font_size: int = DEFAULT_MAX_FONT_SIZE,
    min_font_size: int = DEFAULT_MIN_FONT_SIZE,
    is_rtl: bool = DEFAULT_IS_RTL,
    font_size: Optional[int] = None,
) -> None:
    """
    Draws text into a specified bounding box with alignment and vertical positioning options.

    Args:
        draw (ImageDraw.ImageDraw): Pillow drawing context.
        text (str): Text to render (Farsi or other languages).
        font_path (str): Path to TTF or OTF font file.
        box (tuple): Bounding box coordinates and dimensions (left, top, width, height).
                     Alternatively (x1, y1, x2, y2).
        alignment (str): Horizontal alignment ('left', 'center', 'right').
        vertical_mode (str): Vertical alignment mode ('top_to_bottom', 'center_expanded', 'bottom_to_top').
        auto_size (bool): Whether to automatically adjust font size to fit the box.
        kwargs: Optional parameters like:
            - color (str or tuple): Text color (default 'black').
            - line_spacing (float): Line spacing multiplier (default 1.0).
            - max_font_size (int): Max font size for auto-sizing (default 48).
            - min_font_size (int): Min font size for auto-sizing (default 12).
            - is_rtl (bool): Whether the text is right-to-left (default True).
    """

    if not text.strip():
        return  # Empty or whitespace-only text, skip drawing

    # Extract box dimensions
    if len(box) == 4:
        box_left, box_top, box_width, box_height = box
        box_right = box_left + box_width
        box_bottom = box_top + box_height
    else:
        raise ValueError("Box must be in format (left, top, width, height).")

    if is_rtl:
        prepared_text = prepare_farsi_text(text)
    else:
        prepared_text = text

    # Auto-size font or use provided font size
    if auto_size:
        font_size = calculate_font_size_to_fit(
            prepared_text,
            font_path,
            box_width,
            box_height,
            max_font_size,
            min_font_size,
            line_spacing,
        )
    elif font_size is None:
        font_size = DEFAULT_FONT_SIZE

    # Load the font with determined size
    font = ImageFont.truetype(font_path, font_size, layout_engine=ImageFont.Layout.RAQM)

    raw_lines = wrap_text_to_fit(
        text=text,
        font=font,
        box_width=box_width,
        draw=draw,
    )

    # Wrap text into multiple lines within the box width
    # If is_rtl=False, we just leave them alone
    if is_rtl:
        shaped_lines = [prepare_farsi_text(line) for line in raw_lines]
    else:
        shaped_lines = raw_lines
    lines = wrap_text_to_fit(prepared_text, font, box_width, draw)

    # Calculate total height of text block with spacing
    line_heights = []
    for line in shaped_lines:
        left, top, right, bottom = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bottom - top)

    total_text_height = (
        sum(line_heights) + (len(lines) - 1) * (line_spacing - 1) * line_heights[0]
    )

    total_text_height = (
        sum(line_height * line_spacing for line_height in line_heights)
        - (line_spacing - 1) * line_heights[-1]
    )

    # Determine starting y-coordinate based on vertical_mode
    # if vertical_mode == "top_to_bottom":
    #     current_y = box_top
    # elif vertical_mode == "center_expanded":
    #     current_y = max(box_top + (box_height - total_text_height) / 2, box_top)
    # elif vertical_mode == "bottom_to_top":
    #     current_y = box_bottom - total_text_height
    # else:
    #     raise ValueError(
    #         "vertical_mode must be 'top_to_bottom', 'center_expanded', or 'bottom_to_top'."
    #     )

    # common_h = max(line_heights)

    # # Draw each line with specified horizontal alignment
    # for idx, line in enumerate(shaped_lines):
    #     _left, _top, _right, _bottom = draw.textbbox((0, 0), line, font=font)
    #     line_width = _right - _left
    #     # line_height = _bottom - _top

    #     # Horizontal alignment calculation
    #     if alignment == "left":
    #         current_x = box_left
    #     elif alignment == "center":
    #         current_x = box_left + (box_width - line_width) / 2
    #     elif alignment == "right":
    #         current_x = box_right - line_width
    #     else:
    #         raise ValueError("alignment must be 'left', 'center', or 'right'.")

    #     # Draw the line
    #     draw.text((current_x, current_y - top), line, font=font, fill=color)

    #     # Update y-coordinate for next line
    #     current_y += common_h * line_spacing
    #     if current_y > box_bottom:
    #         break
    boxes = [draw.textbbox((0, 0), l, font=font) for l in shaped_lines]
    line_sizes = [(r - l, b - t) for (l, t, r, b) in boxes]
    first_top = boxes[0][1]  # may be negative

    total_text_height = (
        sum(h for _, h in line_sizes)
        + (len(boxes) - 1) * (line_spacing - 1) * line_sizes[0][1]
    )

    # ── choose starting baseline according to vertical_mode ──────────────
    if vertical_mode == "top_to_bottom":
        current_y = box_top
    elif vertical_mode == "center_expanded":
        current_y = box_top + (box_height - total_text_height) / 2
    elif vertical_mode == "bottom_to_top":
        current_y = box_bottom - total_text_height
    else:
        raise ValueError(
            "vertical_mode must be 'top_to_bottom', 'center_expanded', or 'bottom_to_top'."
        )

    current_y -= first_top  # compensate for the glyph ascent
    # ─────────────────────────────────────────────────────────────────────

    for (l, t, r, b), (w, h), line in zip(boxes, line_sizes, shaped_lines):
        if alignment == "left":
            current_x = box_left
        elif alignment == "center":
            current_x = box_left + (box_width - w) / 2
        else:  # "right"
            current_x = box_right - w

        draw.text((current_x, current_y - t), line, font=font, fill=color)
        current_y += h * line_spacing


def draw_text_no_box(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_path: str,
    x: int,
    y: int,
    alignment: str = "left",
    color: Union[str, Tuple[int, int, int]] = DEFAULT_COLOR,
    font_size: int = DEFAULT_FONT_SIZE,
    is_rtl: bool = DEFAULT_IS_RTL,
) -> None:
    """
    Draws text at a given anchor point (x, y) without bounding box constraints.

    Args:
        draw (ImageDraw.ImageDraw): Pillow drawing context.
        text (str): Text to render.
        font_path (str): Path to the TTF/OTF font file.
        x (int): Horizontal anchor coordinate.
        y (int): Vertical anchor coordinate.
        alignment (str): Horizontal alignment relative to the anchor ('left', 'right', 'center').
        kwargs: Optional parameters including:
            - color (str or tuple): Text color (default 'black').
            - font_size (int): Desired font size (default 24).
            - is_rtl (bool): Whether the text is right-to-left (default True).
    """

    # Prepare Farsi text if needed
    if is_rtl:
        prepared_text = prepare_farsi_text(text)
    else:
        prepared_text = text

    # Load the font
    font = ImageFont.truetype(font_path, font_size, layout_engine=ImageFont.Layout.RAQM)

    # Measure text dimensions
    left, _, right, _ = draw.textbbox((0, 0), prepared_text, font=font)
    text_width = right - left

    # Adjust x based on horizontal alignment
    if alignment == "right":
        adjusted_x = x - text_width
    elif alignment == "center":
        adjusted_x = x - text_width / 2
    elif alignment == "left":
        adjusted_x = x
    else:
        raise ValueError("alignment must be 'left', 'center', or 'right'.")

    # Draw text on the image
    draw.text((adjusted_x, y), prepared_text, font=font, fill=color)


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
