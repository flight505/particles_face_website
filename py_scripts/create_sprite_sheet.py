import os

from PIL import Image


def create_sprite_sheet(
    input_folder: str, output_file: str, background_image_path: str = None
):
    # Constants
    sprite_width, sprite_height = 300, 170
    columns, rows = 5, 10
    sheet_width, sheet_height = sprite_width * columns, sprite_height * rows

    # Create a new blank image with transparency (RGBA)
    sprite_sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))

    # Load and resize the background image if provided
    background_image = None
    if background_image_path:
        background_image = Image.open(background_image_path).convert("RGBA")
        background_image = background_image.resize(
            (sprite_width, sprite_height), Image.Resampling.LANCZOS
        )
        print(f"Background image loaded and resized to: {background_image.size}")

    # Get list of all PNG files in the input folder
    images = [f for f in os.listdir(input_folder) if f.endswith(".png")]
    images.sort()  # Optional: sort images by name

    # Resize and paste each image into the sprite sheet
    for index, image_file in enumerate(images):
        if index >= columns * rows:
            break  # Only process up to the required number of images

        img = Image.open(os.path.join(input_folder, image_file)).convert("RGBA")
        img = img.resize((sprite_width, sprite_height), Image.Resampling.LANCZOS)

        x = (index % columns) * sprite_width
        y = (index // columns) * sprite_height

        # Create a new image for the combined background and sprite
        combined_image = Image.new("RGBA", (sprite_width, sprite_height), (0, 0, 0, 0))

        # Paste the background image first if available
        if background_image:
            combined_image.paste(background_image, (0, 0))
            print(f"Pasted background at: ({x}, {y})")

        # Paste the sprite image on top of the background
        combined_image.alpha_composite(img)
        print(f"Pasted sprite at: ({x}, {y})")

        # Paste the combined image into the sprite sheet
        sprite_sheet.alpha_composite(combined_image, (x, y))

    # Save the sprite sheet
    sprite_sheet.save(output_file)
    print(f"Sprite sheet saved to: {output_file}")


if __name__ == "__main__":
    input_folder = "py_scripts/output_right1_frames"
    output_file = "py_scripts/right1_sprite_sheet.png"
    background_image_path = (
        "py_scripts/300x170background.png"  # Ensure this is 300x170 pixels
    )
    create_sprite_sheet(input_folder, output_file, background_image_path)
