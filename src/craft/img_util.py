# img_util.py

from PIL import Image, ImageEnhance, ImageStat
from typing import Union, Tuple, Optional

def apply_watermark(
    base_img: Union[str, Image.Image],
    watermark: Union[str, Image.Image],
    position: Tuple[int, ...],
    scale: float = 1.0,
    opacity: float = 0.5,
    color: Optional[Union[str, Tuple[int, int, int]]] = None,
    adaptive_color: bool = False,
    brightness_threshold: int = 128,
) -> Image.Image:
    """
    Apply a watermark to a base image with multiple customization options.

    Args:
        base_img: A PIL.Image object or a file path to the base image.
        watermark: A PIL.Image object or a file path to the watermark PNG (white logo with transparency).
        position: If a 2-tuple (x, y), then the watermark is placed at that coordinate
                  (and resized by 'scale'). If a 4-tuple (x, y, width, height), the watermark is resized to fill that box.
        scale: A coefficient to resize the watermark when position is a 2-tuple (default 1.0).
        opacity: A float between 0 (transparent) and 1 (fully opaque) (default 0.5).
        color: Optional new color for the watermark (e.g., "red" or (255, 0, 0)).
               If adaptive_color is True and no explicit color is provided, the watermark color is adjusted
               based on the underlying image brightness.
        adaptive_color: If True, analyze the area under the watermark and adjust its color:
                        for a bright background, a dark (e.g., black) watermark is used, and vice versa.
        brightness_threshold: The brightness level (0–255) used to decide which color to choose in adaptive mode.
    
    Returns:
        A new PIL.Image object with the watermark applied.
    """
    # Determine the appropriate resampling filter.
    try:
        resample_method = Image.Resampling.LANCZOS
    except AttributeError:
        resample_method = Image.ANTIALIAS

    # Load base image if a path is provided, and ensure it's in RGBA mode.
    if isinstance(base_img, str):
        base_img = Image.open(base_img).convert("RGBA")
    else:
        base_img = base_img.convert("RGBA")
    
    # Load watermark image if a path is provided, and ensure it's in RGBA mode.
    if isinstance(watermark, str):
        watermark = Image.open(watermark).convert("RGBA")
    else:
        watermark = watermark.convert("RGBA")
    
    # Determine the watermark size and position.
    if len(position) == 4:
        # Position provided as (x, y, width, height): force resize.
        x, y, w, h = position
        watermark = watermark.resize((w, h), resample=resample_method)
        pos = (x, y)
        region_box = (x, y, x + w, y + h)
    elif len(position) == 2:
        # Position provided as (x, y): use scale to resize watermark.
        x, y = position
        orig_w, orig_h = watermark.size
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        watermark = watermark.resize((new_w, new_h), resample=resample_method)
        pos = (x, y)
        region_box = (x, y, x + new_w, y + new_h)
    else:
        raise ValueError("position must be a tuple of length 2 or 4")
    
    # Adaptive color: analyze the underlying area in the base image.
    if adaptive_color:
        # Crop the region where the watermark will be placed.
        region = base_img.crop(region_box)
        # Convert to grayscale to analyze brightness.
        gray = region.convert("L")
        stat = ImageStat.Stat(gray)
        avg_brightness = stat.mean[0]
        # Choose a contrasting tint:
        # For a bright background use a dark (black) watermark, otherwise white.
        adaptive_tint = (0, 0, 0) if avg_brightness > brightness_threshold else (255, 255, 255)
        if color is None:
            color = adaptive_tint

    # If a color is provided (or chosen adaptively), tint the watermark.
    if color is not None:
        # Create a new image filled with the desired color and use the watermark's alpha channel.
        colored_watermark = Image.new("RGBA", watermark.size, color)
        # Extract the original alpha channel.
        alpha = watermark.split()[-1]
        colored_watermark.putalpha(alpha)
        watermark = colored_watermark

    # Adjust the watermark opacity.
    if opacity < 1:
        alpha = watermark.split()[-1]
        # Enhance the brightness of the alpha channel to adjust opacity.
        alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
        watermark.putalpha(alpha)
    
    # Paste the watermark onto a copy of the base image.
    result = base_img.copy()
    result.paste(watermark, pos, mask=watermark)
    
    return result

# Example usage of the apply_watermark function.
if __name__ == "__main__":
    # Replace these paths with valid image file paths on your system.
    base_image_path = "./assets/OutPut/newspaper_output.png"
    watermark_path = "./assets/images/watermark2.png"
    
    # Example: place watermark at (50, 50) with a scaling factor of 0.5, 70% opacity, and adaptive color enabled.
    watermarked_image = apply_watermark(
        base_img=base_image_path,
        watermark=watermark_path,
        position=(2050, 2050),  # Use a 2-tuple for position.
        scale=2.5,
        opacity=0.7,
        adaptive_color=True,
    )
    
    # To display the watermarked image:
    watermarked_image.show()
    
    # To save the watermarked image, uncomment the following line:
    # watermarked_image.save("path/to/output_image.png")
