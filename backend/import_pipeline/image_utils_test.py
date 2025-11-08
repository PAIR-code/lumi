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
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from PIL import Image as PIL_Image
from shared.lumi_doc import ImageContent
from shared.types import ImageMetadata

from import_pipeline import image_utils


class ImageUtilsTest(unittest.TestCase):
    def setUp(self):
        # Create a dummy local image bucket for testing
        self.test_bucket_base = "test_local_image_bucket"
        image_utils.LOCAL_IMAGE_BUCKET_BASE = self.test_bucket_base + "/"
        # Create a temporary source directory for latex files
        self.source_dir = tempfile.mkdtemp()
        os.makedirs(self.test_bucket_base, exist_ok=True)

    def tearDown(self):
        # Clean up the dummy local image bucket and source dir
        if os.path.exists(self.test_bucket_base):
            shutil.rmtree(self.test_bucket_base)
        if os.path.exists(self.source_dir):
            shutil.rmtree(self.source_dir)

    def test_download_image_from_storage(self):
        """Tests that image bytes are downloaded from local storage."""
        # Create a temporary test file
        import os
        import tempfile

        with tempfile.NamedTemporaryFile(mode="wb", delete=False) as f:
            f.write(b"test image data")
            temp_path = f.name

        try:
            result_bytes = image_utils.download_image_from_storage(temp_path)
            self.assertEqual(result_bytes, b"test image data")
        finally:
            os.unlink(temp_path)

    def test_check_target_in_path(self):
        """Tests the check_target_in_path function with various scenarios."""
        # Exact match
        self.assertTrue(image_utils.check_target_in_path("/a/b/c.png", "a/b/c.png"))
        # Match at the end of a path
        self.assertTrue(image_utils.check_target_in_path("/a/b/c.png", "b/c.png"))
        # Match at the start of a path
        self.assertTrue(image_utils.check_target_in_path("a/b/c.png", "a/b/c.png"))
        # Case-sensitivity
        self.assertFalse(image_utils.check_target_in_path("/A/B/C.PNG", "a/b/c.png"))
        # Windows paths
        self.assertTrue(
            image_utils.check_target_in_path(
                "C:\\Users\\Test\\file.jpg", "Test/file.jpg"
            )
        )

        # Non-match due to partial path component
        self.assertFalse(image_utils.check_target_in_path("/a/b/my_c.png", "c.png"))
        self.assertFalse(image_utils.check_target_in_path("/a/b/c.pngg", "c.png"))
        # Non-match with different extensions
        self.assertFalse(image_utils.check_target_in_path("/a/b/c.jpg", "c.png"))
        # Non-match because it's not at the end
        self.assertFalse(image_utils.check_target_in_path("/a/b/c.png/d", "c.png"))

        # Match target without extension
        self.assertTrue(image_utils.check_target_in_path("/a/b/c.png", "c"))
        # Match target without extension at end of path
        self.assertTrue(image_utils.check_target_in_path("/a/b/c.png", "b/c"))
        # Non-match target without extension
        self.assertFalse(image_utils.check_target_in_path("/a/b/c.png", "d"))
        # Non-match partial component for extensionless
        self.assertFalse(image_utils.check_target_in_path("/a/b/my_c.png", "c"))
        # Match when both full_path and target are extensionless
        self.assertTrue(image_utils.check_target_in_path("/a/b/c", "b/c"))
        # Non-match when target has extension but full_path does not
        self.assertFalse(image_utils.check_target_in_path("/a/b/c", "c.png"))

    @patch("import_pipeline.image_utils.storage")
    def test_extract_images_from_latex_source_cloud(self, mock_storage):
        """Tests that images are uploaded to cloud storage when run_locally=False."""
        file_id = "test_file_id"
        image_contents = [
            ImageContent(
                latex_path="fig1.png",
                storage_path=f"{file_id}/images/fig1.png",
                alt_text="",
                width=0,
                height=0,
            )
        ]

        # Create a dummy source file
        with open(os.path.join(self.source_dir, "fig1.png"), "w") as f:
            f.write("dummy_image_data")

        # Mock storage client
        mock_bucket = MagicMock()
        mock_blob = MagicMock()
        mock_storage.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        with patch("import_pipeline.image_utils.Image.open") as mock_image_open:
            mock_img = MagicMock()
            mock_img.width = 100
            mock_img.height = 150
            mock_image_open.return_value.__enter__.return_value = mock_img

            # Call with run_locally=False (the default)
            result_metadata = image_utils.extract_images_from_latex_source(
                self.source_dir, image_contents, run_locally=False
            )

            # Assertions for cloud path
            mock_storage.bucket.assert_called_once_with()
            mock_bucket.blob.assert_called_once_with(f"{file_id}/images/fig1.png")
            mock_blob.upload_from_filename.assert_called_once_with(
                os.path.join(self.source_dir, "fig1.png")
            )

            # Check metadata and updated ImageContent
            self.assertEqual(image_contents[0].width, 100)
            self.assertEqual(image_contents[0].height, 150)
            expected_metadata = [
                ImageMetadata(
                    storage_path=f"{file_id}/images/fig1.png", width=100.0, height=150.0
                )
            ]
            self.assertEqual(result_metadata, expected_metadata)

    @patch("shutil.copy")
    def test_extract_images_from_latex_source_local(self, mock_copy):
        """Tests that images are copied locally when run_locally=True."""
        file_id = "test_file_id"
        image_contents = [
            ImageContent(
                latex_path="fig1.png",
                storage_path=f"{file_id}/images/fig1.png",
                alt_text="",
                width=0,
                height=0,
            )
        ]

        # Create a dummy source file
        with open(os.path.join(self.source_dir, "fig1.png"), "w") as f:
            f.write("dummy_image_data")

        with patch("import_pipeline.image_utils.Image.open") as mock_image_open:
            mock_img = MagicMock()
            mock_img.width = 100
            mock_img.height = 150
            mock_image_open.return_value.__enter__.return_value = mock_img

            # Call with run_locally=True
            result_metadata = image_utils.extract_images_from_latex_source(
                self.source_dir, image_contents, run_locally=True
            )

            # Assertions for local path
            expected_dest_path = os.path.join(
                self.test_bucket_base, f"{file_id}/images/fig1.png"
            )
            mock_copy.assert_called_once_with(
                os.path.join(self.source_dir, "fig1.png"), expected_dest_path
            )

            # Check metadata and updated ImageContent
            self.assertEqual(image_contents[0].width, 100)
            self.assertEqual(image_contents[0].height, 150)
            expected_metadata = [
                ImageMetadata(
                    storage_path=f"{file_id}/images/fig1.png", width=100.0, height=150.0
                )
            ]
            self.assertEqual(result_metadata, expected_metadata)

    def test_extract_images_from_latex_source_finds_images_recursively(self):
        file_id = "test_file_id"

        # --- Setup source directory with images ---
        # This needs to happen *before* we patch os.makedirs, otherwise the
        # mock will prevent these directories and files from being created.
        # Image at root
        with open(os.path.join(self.source_dir, "fig1.png"), "w") as f:
            f.write("dummy_image_data_1")
        # Image in a subdirectory
        graphics_subdir = os.path.join(self.source_dir, "images")
        os.makedirs(graphics_subdir, exist_ok=True)
        with open(os.path.join(graphics_subdir, "fig2.jpg"), "w") as f:
            f.write("dummy_image_data_2")
        # Image in a nested subdirectory
        nested_subdir = os.path.join(self.source_dir, "nested", "deep")
        os.makedirs(nested_subdir, exist_ok=True)
        with open(os.path.join(nested_subdir, "fig3.png"), "w") as f:
            f.write("dummy_image_data_3")
        # A file with same name as another, but in different path
        other_subdir = os.path.join(self.source_dir, "other")
        os.makedirs(other_subdir, exist_ok=True)
        with open(os.path.join(other_subdir, "fig1.png"), "w") as f:
            f.write("dummy_image_data_4")

        # --- Define ImageContent objects as input ---

        image_contents = [
            ImageContent(
                latex_path="other/fig1.png",
                storage_path=f"{file_id}/images/other__fig1.png",
                alt_text="",
                width=0,
                height=0,
            ),  # Should find the one in 'other' dir
            ImageContent(
                latex_path="images/fig2.jpg",
                storage_path=f"{file_id}/images/images__fig2.jpg",
                alt_text="",
                width=0,
                height=0,
            ),
            ImageContent(
                latex_path="nested/deep/fig3.png",
                storage_path=f"{file_id}/images/nested__deep__fig3.png",
                alt_text="",
                width=0,
                height=0,
            ),
            ImageContent(
                latex_path="nonexistent.png",
                storage_path=f"{file_id}/images/nonexistent.png",
                alt_text="",
                width=0,
                height=0,
            ),
        ]

        # --- Mock dependencies ---
        with (
            patch("import_pipeline.image_utils.Image.open") as mock_image_open,
            patch("shutil.copy") as mock_copy,
            patch("os.makedirs") as mock_makedirs,
        ):
            # --- Configure mocks ---
            # Mock Image.open to return mock image objects with dimensions
            mock_img1 = MagicMock()
            mock_img1.width = 100
            mock_img1.height = 150
            mock_img2 = MagicMock()
            mock_img2.width = 200
            mock_img2.height = 250
            mock_img3 = MagicMock()
            mock_img3.width = 300
            mock_img3.height = 350
            mock_image_open.return_value.__enter__.side_effect = [
                mock_img1,
                mock_img2,
                mock_img3,
            ]

            # --- Call the function ---
            with self.assertWarnsRegex(
                UserWarning,
                "Could not find image matching path suffix 'nonexistent.png'",
            ):
                result_metadata = image_utils.extract_images_from_latex_source(
                    self.source_dir, image_contents, run_locally=True
                )

            # --- Assertions ---
            # Check that os.makedirs was called for the destination directories
            mock_makedirs.assert_any_call(
                f"{self.test_bucket_base}/{file_id}/images", exist_ok=True
            )

            # Check that shutil.copy was called with correct paths
            mock_copy.assert_any_call(
                os.path.join(self.source_dir, "other", "fig1.png"),
                f"{self.test_bucket_base}/{file_id}/images/other__fig1.png",
            )
            mock_copy.assert_any_call(
                os.path.join(self.source_dir, "images", "fig2.jpg"),
                f"{self.test_bucket_base}/{file_id}/images/images__fig2.jpg",
            )
            mock_copy.assert_any_call(
                os.path.join(self.source_dir, "nested", "deep", "fig3.png"),
                f"{self.test_bucket_base}/{file_id}/images/nested__deep__fig3.png",
            )

            self.assertEqual(image_contents[0].width, 100)
            self.assertEqual(image_contents[0].height, 150)
            self.assertEqual(image_contents[1].width, 200)
            self.assertEqual(image_contents[1].height, 250)
            self.assertEqual(image_contents[2].width, 300)
            self.assertEqual(image_contents[2].height, 350)
            self.assertEqual(image_contents[3].width, 0)  # Unchanged
            self.assertEqual(image_contents[3].height, 0)  # Unchanged

            # Check the returned metadata
            expected_metadata = [
                ImageMetadata(
                    storage_path=f"{file_id}/images/other__fig1.png",
                    width=100.0,
                    height=150.0,
                ),
                ImageMetadata(
                    storage_path=f"{file_id}/images/images__fig2.jpg",
                    width=200.0,
                    height=250.0,
                ),
                ImageMetadata(
                    storage_path=f"{file_id}/images/nested__deep__fig3.png",
                    width=300.0,
                    height=350.0,
                ),
            ]
            self.assertEqual(result_metadata, expected_metadata)

    def test_extract_images_from_latex_source_raises_on_duplicate(self):
        # Create two files that could ambiguously match the same latex_path
        # e.g., latex_path is "fig.png" and we have "a/fig.png" and "b/fig.png"
        dir_a = os.path.join(self.source_dir, "a")
        os.makedirs(dir_a)
        with open(os.path.join(dir_a, "duplicate.png"), "w") as f:
            f.write("dummy1")

        dir_b = os.path.join(self.source_dir, "b")
        os.makedirs(dir_b)
        with open(os.path.join(dir_b, "duplicate.png"), "w") as f:
            f.write("dummy2")

        image_contents = [
            ImageContent(
                latex_path="duplicate.png",
                storage_path="f/images/duplicate.png",
                alt_text="",
                width=0,
                height=0,
            )
        ]

        with self.assertRaisesRegex(
            ValueError, "Found multiple images matching path suffix 'duplicate.png'"
        ):
            image_utils.extract_images_from_latex_source(
                self.source_dir, image_contents, run_locally=True
            )

    def test_extract_images_handles_pdfs(self):
        file_id = "test_pdf_file"

        # --- Setup source directory with a PDF ---
        pdf_path = os.path.join(self.source_dir, "figure1.pdf")
        with open(pdf_path, "w") as f:
            f.write("dummy_pdf_data")

        image_contents = [
            ImageContent(
                latex_path="figure1.pdf",
                storage_path=f"{file_id}/images/figure1.pdf",
                alt_text="",
                width=0,
                height=0,
            )
        ]

        # --- Mock dependencies ---
        with (
            patch("import_pipeline.image_utils.pdfium.PdfDocument") as mock_pdf_doc,
            patch("import_pipeline.image_utils.Image.open") as mock_image_open,
            patch("shutil.copy") as mock_copy,
        ):
            # --- Configure mocks ---
            # Mock pypdfium2 conversion
            mock_pil_image = MagicMock(spec=PIL_Image.Image)
            mock_page = MagicMock()

            mock_render_result = MagicMock()
            mock_render_result.to_pil.return_value = mock_pil_image
            mock_page.render.return_value = mock_render_result

            mock_pdf_instance = mock_pdf_doc.return_value
            mock_pdf_instance.__len__.return_value = 3  # Test multi-page warning
            mock_pdf_instance.get_page.return_value = mock_page

            # Mock Image.open for dimension reading
            mock_opened_img = MagicMock()
            mock_opened_img.width = 500
            mock_opened_img.height = 600
            mock_image_open.return_value.__enter__.return_value = mock_opened_img

            # --- Call the function ---
            with self.assertWarnsRegex(
                UserWarning,
                "PDF 'figure1.pdf' has 3 pages. Only the first page will be converted.",
            ):
                result_metadata = image_utils.extract_images_from_latex_source(
                    self.source_dir, image_contents, run_locally=True
                )

            # --- Assertions ---
            # Check that pypdfium2 was called correctly
            mock_pdf_doc.assert_called_once_with(pdf_path)
            mock_pdf_instance.get_page.assert_called_once_with(0)
            mock_page.render.assert_called_once()
            mock_render_result.to_pil.assert_called_once()

            # Check that the converted image was saved to a temp path
            mock_pil_image.save.assert_called_once()
            saved_temp_path = mock_pil_image.save.call_args[0][0]
            self.assertTrue(saved_temp_path.endswith("figure1_pdf.png"))

            # Check that shutil.copy was called with the temp PNG and the new destination path
            expected_dest_path = (
                f"{self.test_bucket_base}/{file_id}/images/figure1_pdf.png"
            )
            mock_copy.assert_called_once_with(saved_temp_path, expected_dest_path)

            mock_image_open.assert_called_once_with(saved_temp_path)

            expected_storage_path = f"{file_id}/images/figure1_pdf.png"
            # Check that the ImageContent object was updated
            self.assertEqual(image_contents[0].storage_path, expected_storage_path)
            self.assertEqual(image_contents[0].width, 500)
            self.assertEqual(image_contents[0].height, 600)

            # Check the returned metadata
            expected_metadata = [
                ImageMetadata(
                    storage_path=expected_storage_path, width=500.0, height=600.0
                )
            ]
            self.assertEqual(result_metadata, expected_metadata)
