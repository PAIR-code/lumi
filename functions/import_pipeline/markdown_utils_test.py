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

import unittest
from import_pipeline import markdown_utils
from shared import import_tags

TEST_PAPER = f"""{import_tags.L_TITLE_START} # The Future of AI in Scientific Discovery {import_tags.L_TITLE_END}

{import_tags.L_AUTHORS_START} Dr. Alex Chen, Prof. Brenda Lee, Dr. Chris Davies {import_tags.L_AUTHORS_END}

{import_tags.L_ABSTRACT_START}
Artificial Intelligence (AI) is rapidly transforming various fields of scientific inquiry. This paper explores the potential of advanced AI models to accelerate discovery, particularly in areas like material science and drug development. We highlight current limitations and propose future research directions to harness AI's full **transformative** power. Our findings indicate a significant shift in research paradigms.
{import_tags.L_ABSTRACT_END}

{import_tags.L_CONTENT_START}
## I. INTRODUCTION
The integration of Artificial Intelligence (AI) into scientific research promises a paradigm shift {import_tags.L_CITATION_START_PREFIX}1{import_tags.L_CITATION_END}1.{import_tags.L_CITATION_START_PREFIX}1{import_tags.L_CITATION_END} From automating data analysis to generating novel hypotheses, AI tools are becoming indispensable.

This work focuses on how AI can enhance the speed and accuracy of scientific discoveries. For example, machine learning algorithms can predict molecular properties with an efficiency defined by $E = \alpha \beta^2$.

{import_tags.L_IMG_START_PREFIX}0{import_tags.L_IMG_END}
Fig. 1: A conceptual diagram illustrating AI's role in scientific discovery.

## II. METHODS AND APPROACH
Our methodology combines cutting-edge deep learning techniques with traditional scientific modeling. We developed a novel *hybrid* framework designed for complex, multi-modal datasets.

### A. Data Acquisition
Data was meticulously collected from publicly available databases and proprietary experimental results. Ensuring data quality was paramount.

{import_tags.L_IMG_START_PREFIX}1{import_tags.L_IMG_END}
Fig. 2: Overview of our data acquisition and processing pipeline.

## III. RESULTS AND DISCUSSION
Preliminary results demonstrate that our AI models can significantly reduce the time required for identifying promising candidates in drug discovery. We observed a 10x acceleration compared to conventional methods.

The impact of this work is **profound**, suggesting a future where AI acts as a collaborative partner in the lab.

{import_tags.L_CONTENT_END}

{import_tags.L_REFERENCES_START}
{import_tags.L_REFERENCE_ITEM_START_PREFIX}1{import_tags.L_REFERENCE_ITEM_END}[1] A. Chen, "AI for Materials Science: A Review," *Journal of Advanced AI Research*, 2023, pp. 100-115.{import_tags.L_REFERENCE_ITEM_END_GENERIC}
{import_tags.L_REFERENCE_ITEM_START_PREFIX}2{import_tags.L_REFERENCE_ITEM_END}[2] B. Lee, "Deep Learning in Drug Discovery," *Nature AI Reviews*, vol. 5, no. 2, 2022, pp. 50-65.{import_tags.L_REFERENCE_ITEM_END_GENERIC}
{import_tags.L_REFERENCE_ITEM_START_PREFIX}3{import_tags.L_REFERENCE_ITEM_END}[3] C. Davies, "Ethical Considerations in AI Research," *AI and Society*, 2024. [Online]. Available: https://example.com/ethical-ai{import_tags.L_REFERENCE_ITEM_END_GENERIC}
{import_tags.L_REFERENCES_END}
"""


TEST_SECTION_WITH_BULLETS = """Some text before the list items:

*   **Bullet 1**: content

*   **Bullet 2**: content

"""


class TestMarkdownUtils(unittest.TestCase):
    def test_parse_lumi_import(self):
        parsed_output = markdown_utils.parse_lumi_import(TEST_PAPER)

        # Test Title
        self.assertIn("title", parsed_output)
        self.assertEqual(
            parsed_output["title"].strip(), "# The Future of AI in Scientific Discovery"
        )

        # Test Authors
        self.assertIn("authors", parsed_output)
        self.assertEqual(
            parsed_output["authors"].strip(),
            "Dr. Alex Chen, Prof. Brenda Lee, Dr. Chris Davies",
        )

        # Test Abstract
        self.assertIn("abstract", parsed_output)
        self.assertIn(
            "Artificial Intelligence (AI) is rapidly transforming",
            parsed_output["abstract"],
        )
        self.assertIn(
            "**transformative**",
            parsed_output["abstract"],
            "Abstract missing bold formatting",
        )

        # Test Content
        self.assertIn("content", parsed_output)
        self.assertIn("## I. INTRODUCTION", parsed_output["content"])
        self.assertIn(
            "$E = \alpha \beta^2$",
            parsed_output["content"],
            "Content missing formula",
        )
        self.assertIn(
            "[[l-image_0]]",
            parsed_output["content"],
            "Content missing image placeholder 0",
        )
        self.assertIn(
            "Fig. 1: A conceptual diagram illustrating AI's role in scientific discovery.",
            parsed_output["content"],
            "Content missing image caption 0",
        )
        self.assertIn(
            "*hybrid*", parsed_output["content"], "Content missing italic formatting"
        )
        self.assertIn(
            "**profound**", parsed_output["content"], "Content missing bold formatting"
        )

        # Test References
        self.assertIn("references", parsed_output)
        self.assertIsInstance(parsed_output["references"], list)
        self.assertEqual(len(parsed_output["references"]), 3)
        self.assertEqual(
            parsed_output["references"][0],
            {
                "id": "1",
                "content": '[1] A. Chen, "AI for Materials Science: A Review," *Journal of Advanced AI Research*, 2023, pp. 100-115.',
            },
        )

    def test_markdown_to_html(self):
        with self.subTest("test_basic_paragraph"):
            markdown_input = "Hello, world!"
            expected_html = """<p>Hello, world!</p>
"""
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("test_multiple_paragraphs"):
            markdown_input = """Hello, world!

Hello, world again!"""
            expected_html = """<p>Hello, world!</p>
<p>Hello, world again!</p>
"""
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("test_heading"):
            markdown_input = "# My Heading"
            expected_html = """<h1>My Heading</h1>
"""
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("test_bold_text"):
            markdown_input = "**Bold Text**"
            expected_html = """<p><strong>Bold Text</strong></p>
"""
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("test_empty_string"):
            markdown_input = ""
            expected_html = ""
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("test_section_with_spaced_bullets"):
            markdown_input = TEST_SECTION_WITH_BULLETS
            expected_html = """<p>Some text before the list items:</p>
<ul>
<li>
<p><strong>Bullet 1</strong>: content</p>
</li>
<li>
<p><strong>Bullet 2</strong>: content</p>
</li>
</ul>
"""
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("underscores remain as underscores"):
            self.maxDiff = None
            markdown_input = "This is $\mathcal{a}_{b}$"
            expected_html = "<p>This is $\mathcal{a}_{b}$</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )


if __name__ == "__main__":
    unittest.main()
