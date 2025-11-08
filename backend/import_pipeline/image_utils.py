# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================


import os
import re
import shutil
import tempfile
import warnings
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image
from shared.lumi_doc import ImageContent
from shared.types import ImageMetadata

# Import settings to use configured storage path
try:
    from config import settings

    LOCAL_IMAGE_BUCKET_BASE = settings.LOCAL_STORAGE_PATH
except ImportError:
    # Fallback for when running outside backend context (e.g., tests)
    LOCAL_IMAGE_BUCKET_BASE = "../local_image_bucket"

TEMPORARY_EXTRACTION_DIR = "temp_extraction"


def download_image_from_storage(storage_path: str) -> bytes:
    """
    Downloads an image from local/MinIO storage.

    Args:
        storage_path (str): The path to the image in storage.

    Returns:
        bytes: The image data as bytes.

    Raises:
        Exception: If the image cannot be downloaded.
    """
    try:
        # Read from local filesystem
        with open(storage_path, "rb") as f:
            return f.read()
    except Exception as e:
        warnings.warn(
            f"Could not download image from storage at {storage_path}: {e}",
            stacklevel=2,
        )
        raise


def check_target_in_path(full_path: str, target: str) -> bool:
    """
    Checks if the target path is at the end of the full path.

    The match is successful if the target is preceded by a '/' or is at the
    beginning of the string. This prevents partial matches on filenames.
    For example, `a/b/my_fig.png` will not match `fig.png`.

    If the target has no file extension, it will match a path that has an
    extension. For example, a target of `b/c` will match `/a/b/c.png`.

    Args:
        full_path (str): The full path to the file.
        target (str): The target path suffix to check for.

    Returns:
        bool: True if the target path is found at the end of the full path.
    """
    # Normalize paths to handle different OS separators
    full_path = full_path.replace("\\", "/")
    target = target.replace("\\", "/")

    escaped_target = re.escape(target)

    # If the target doesn't have a file extension, allow the full_path to have one.
    if "." not in os.path.basename(target):
        # Regex:
        # - (^|/): Matches either the start of the string or a literal '/'
        # - {escaped_target}: The path we're looking for
        # - (\.[^/.]+)?$: Optionally matches a file extension at the end of the string.
        pattern = f"(^|/){escaped_target}(\\.[^/.]+)?$"
    else:
        pattern = f"(^|/){escaped_target}$"

    return re.search(pattern, full_path) is not None


def extract_images_from_latex_source(
    source_dir: str, image_contents: list[ImageContent], run_locally: bool = False
) -> list[ImageMetadata]:
    """
    Finds image files from the LaTeX source directory by searching all
    subdirectories, copies them to the image bucket, and returns their metadata.
    If a file is a PDF, it converts the first page to a PNG before processing.

    The search logic matches the end of the file path, so a `latex_path` of
    `images/fig.png` will match `/tmp/source/images/fig.png` but not
    `/tmp/source/other/fig.png`.

    Args:
        source_dir (str): The temporary directory where LaTeX source was extracted.
        image_contents (List[ImageContent]): A list of ImageContent objects
                                             parsed from the model output.
        run_locally (bool): If true, saves to local filesystem. Otherwise, saves
                            to cloud storage.

    Returns:
        List[ImageMetadata]: A list of metadata for the successfully processed images.

    Raises:
        ValueError: If more than one image with the same name is found in the
                    source directory tree, causing ambiguity.
    """
    processed_image_metadata: list[ImageMetadata] = []

    with tempfile.TemporaryDirectory() as temp_pdf_conversion_dir:
        for image_content in image_contents:
            # Normalizes the latex_path
            latex_path = os.path.join(*image_content.latex_path.split("/"))
            storage_path = image_content.storage_path

            # Search for the image file in all subdirectories of source_dir
            found_paths = []
            for root, _, files in os.walk(source_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    if check_target_in_path(full_path=full_path, target=latex_path):
                        found_paths.append(full_path)

            if len(found_paths) == 0:
                warnings.warn(
                    f"Could not find image matching path suffix '{latex_path}' in any subdirectory of '{source_dir}'",
                    stacklevel=2,
                )
                continue

            if len(found_paths) > 1:
                # This case should be rare if paths are specific enough, but is a safeguard.
                raise ValueError(
                    f"Found multiple images matching path suffix '{latex_path}' in source directory: {found_paths}. Cannot determine which one to use."
                )

            source_image_path = found_paths[0]

            # PDF conversion logic
            if source_image_path.lower().endswith(".pdf"):
                try:
                    pdf = pdfium.PdfDocument(source_image_path)
                    num_pages = len(pdf)
                    if num_pages > 1:
                        warnings.warn(
                            f"PDF '{latex_path}' has {num_pages} pages. Only the first page will be converted.",
                            stacklevel=2,
                        )

                    if num_pages == 0:
                        raise Exception("pypdfium2 conversion returned no pages.")

                    # Render first page to a PIL image
                    page = pdf.get_page(0)
                    pil_image = page.render(scale=2).to_pil()

                    # Create a new path for the converted image
                    # The stem is the path without the suffix (i.e. .pdf)
                    original_stem = Path(source_image_path).stem
                    temp_png_path = os.path.join(
                        temp_pdf_conversion_dir, f"{original_stem}_pdf.png"
                    )
                    pil_image.save(temp_png_path, format="PNG")

                    # Update source_image_path to point to the new PNG
                    source_image_path = temp_png_path

                    # Update storage_path to reflect the new file extension
                    path = Path(storage_path)
                    new_filename = f"{path.stem}_pdf.png"
                    # Get the path with the name updated.
                    storage_path = str(path.with_name(new_filename))
                    image_content.storage_path = storage_path

                except Exception as e:
                    warnings.warn(
                        f"Could not convert PDF {latex_path}: {e}", stacklevel=2
                    )
                    continue

            try:
                # Get image dimensions before upload
                with Image.open(source_image_path) as img:
                    width, height = float(img.width), float(img.height)

                # Create the destination directory in the image bucket, if needed
                # e.g., ../local_image_bucket/file_id/images/
                destination_full_path = os.path.join(
                    LOCAL_IMAGE_BUCKET_BASE, storage_path
                )
                os.makedirs(os.path.dirname(destination_full_path), exist_ok=True)
                # Copy the file
                shutil.copy(source_image_path, destination_full_path)

                # Update the width and height on the existing ImageContent object
                image_content.width = width
                image_content.height = height

                # Create metadata for the processed image
                processed_image_metadata.append(
                    ImageMetadata(storage_path=storage_path, width=width, height=height)
                )
            except Exception as e:
                warnings.warn(
                    f"Could not process image {latex_path}: {e}", stacklevel=2
                )
                continue

    return processed_image_metadata
