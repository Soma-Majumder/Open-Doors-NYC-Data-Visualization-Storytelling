"""Create the Open Doors 1200 x 630 social-sharing card from the supplied pencil."""

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH, HEIGHT = 1200, 630
CARD = "assets/open-doors-social-card.png"
PENCIL = "assets/pencil.png"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def remove_white_background(image):
    """Keep the supplied illustration while making its white canvas transparent."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if red > 245 and green > 245 and blue > 245:
                pixels[x, y] = (red, green, blue, 0)
    return rgba


def main():
    card = Image.new("RGB", (WIDTH, HEIGHT), "#FDF3EE")
    draw = ImageDraw.Draw(card)

    # Warm, on-brand layers.
    draw.ellipse((920, -115, 1275, 240), fill="#F2CFC4")
    draw.ellipse((1000, -80, 1300, 220), fill="#E8A08D")
    draw.polygon([(0, 492), (220, 425), (500, 485), (860, 375), (1200, 420), (1200, 630), (0, 630)], fill="#F2CFC4")
    draw.rounded_rectangle((70, 66, 78, 564), radius=4, fill="#C4463F")

    eyebrow = font(ARIAL_BOLD, 20)
    title = font(GEORGIA, 100)
    body = font(ARIAL, 39)
    url = font(ARIAL_BOLD, 23)
    draw.text((110, 104), "NYC MIDDLE-SCHOOL MATH ACCESS GUIDE", fill="#C4463F", font=eyebrow, spacing=7)
    draw.text((110, 194), "Open Doors", fill="#3A211C", font=title)
    draw.text((110, 330), "Find middle schools that give access", fill="#6B534C", font=body)
    draw.text((110, 380), "to advanced math.", fill="#6B534C", font=body)
    draw.text((110, 510), "OPEN DOORS", fill="#C4463F", font=url)

    pencil = remove_white_background(Image.open(PENCIL))
    pencil.thumbnail((400, 400), Image.Resampling.LANCZOS)
    pencil = pencil.rotate(-22, resample=Image.Resampling.BICUBIC, expand=True)

    # A soft shadow gives the supplied illustration contrast without changing it.
    shadow = Image.new("RGBA", pencil.size, (58, 33, 28, 0))
    shadow.putalpha(pencil.getchannel("A").filter(ImageFilter.GaussianBlur(13)).point(lambda a: a // 5))
    card.paste(shadow, (755, 146), shadow)
    card.paste(pencil, (730, 118), pencil)

    card.save(CARD, "PNG", optimize=True)


if __name__ == "__main__":
    main()
