import os

from PIL import Image


def create_sprite_sheet(
    input_folder: str, output_file: str, background_image_path: str = None
):
    # Constants
    sprite_width, sprite_height = 300, 150
    columns, rows = 6, 10  # For 60 frames (5x10 grid)

    sheet_width = sprite_width * columns
    sheet_height = sprite_height * rows

    # Create a new blank image with transparency (RGBA)
    sprite_sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))

    # Load the background image if provided
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

    # Process each image and add it to the sprite sheet
    for index, image_file in enumerate(images):
        if index >= columns * rows:
            print(
                f"Warning: More than {columns * rows} images found. Extra images will be ignored."
            )
            break  # Only process up to the required number of images

        img = Image.open(os.path.join(input_folder, image_file)).convert("RGBA")

        # Resize the image to target sprite size
        img_resized = img.resize(
            (sprite_width, sprite_height), Image.Resampling.LANCZOS
        )

        # Calculate position for this sprite
        x = (index % columns) * sprite_width
        y = (index // columns) * sprite_height

        # Create a new image for the combined background and sprite
        combined_image = Image.new("RGBA", (sprite_width, sprite_height), (0, 0, 0, 0))

        # Paste the background image first if available
        if background_image:
            combined_image.paste(background_image, (0, 0))
            print(f"Pasted background at: ({x}, {y})")

        # Paste the sprite image on top of the background
        combined_image.alpha_composite(img_resized)
        print(f"Pasted sprite at: ({x}, {y})")

        # Paste the combined image into the sprite sheet
        sprite_sheet.paste(combined_image, (x, y))

    # Save the sprite sheet
    sprite_sheet.save(output_file)
    print(f"Sprite sheet saved to: {output_file}")


if __name__ == "__main__":
    input_folder = "py_scripts/output_360_face_frames"
    output_file = "py_scripts/360_face_sprite_sheet.png"
    background_image_path = (
        None  # Uncomment and set path if you want to use a background image
    )
    create_sprite_sheet(
        input_folder,
        output_file,
    )
