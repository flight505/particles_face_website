import numpy as np
from PIL import Image, ImageFilter


def generate_displacement_map(
    image_path,
    blur_radius=1,
    brightness_factor=1.1,
    contrast_min=90,
    contrast_max=190,
    output_path="displacement_map.jpeg",
):
    """
    Generates a smooth displacement map from a color sprite sheet image.

    Parameters:
    - image_path (str): Path to the input image (color sprite sheet).
    - blur_radius (float): Amount of Gaussian blur applied to smooth the image. Default is 1.
    - brightness_factor (float): Factor by which to adjust brightness for dark areas (background, hair). Default is 1.1.
    - contrast_min (int): Minimum value for contrast adjustment. Default is 90.
    - contrast_max (int): Maximum value for contrast adjustment. Default is 190.
    - output_path (str): Path where the output displacement map will be saved. Default is 'displacement_map.jpeg'.

    Returns:
    - output_path (str): Path to the saved displacement map.
    """

    # Step 1: Load the image and convert it to grayscale (luminosity-based conversion)
    color_image = Image.open(image_path)
    grayscale_image = color_image.convert("L")

    # Step 2: Apply Gaussian blur to smooth out abrupt intensity changes
    smoothed_image = grayscale_image.filter(ImageFilter.GaussianBlur(blur_radius))

    # Step 3: Convert the image to a numpy array for pixel-wise manipulation
    image_array = np.array(smoothed_image)

    # Step 4: Lighten the dark areas (background and hair) slightly to prevent them from being too recessed
    lightened_array = np.where(
        image_array < 150, image_array * brightness_factor, image_array
    )

    # Step 5: Adjust contrast to bring out facial details more clearly
    # We use np.interp to remap the pixel values between the contrast_min and contrast_max
    contrast_adjusted_array = np.interp(
        lightened_array,
        (lightened_array.min(), lightened_array.max()),
        (contrast_min, contrast_max),
    )

    # Step 6: Convert the numpy array back to an image
    displacement_map_image = Image.fromarray(contrast_adjusted_array.astype(np.uint8))

    # Step 7: Save the displacement map
    displacement_map_image.save(output_path)

    return output_path


# Example usage for two sprite sheet images
sprite_sheet_1_path = (
    "path_to_sprite_sheet_1.jpeg"  # Replace with the actual path to your first image
)
sprite_sheet_2_path = (
    "path_to_sprite_sheet_2.jpeg"  # Replace with the actual path to your second image
)

# Generate displacement maps for both images
output_1 = generate_displacement_map(
    sprite_sheet_1_path,
    blur_radius=1.5,
    brightness_factor=1.2,
    contrast_min=80,
    contrast_max=200,
    output_path="displacement_map_1.jpeg",
)
output_2 = generate_displacement_map(
    sprite_sheet_2_path,
    blur_radius=1.5,
    brightness_factor=1.2,
    contrast_min=80,
    contrast_max=200,
    output_path="displacement_map_2.jpeg",
)

print(f"Displacement maps saved as: {output_1}, {output_2}")
