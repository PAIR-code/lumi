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
from unittest.mock import patch

from shared import import_tags

from import_pipeline import markdown_utils

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

{import_tags.L_FOOTNOTES_START}
{import_tags.L_FOOTNOTE_CONTENT_START_PREFIX}1{import_tags.L_FOOTNOTE_CONTENT_END}This is the first footnote.{import_tags.L_FOOTNOTE_CONTENT_END_PREFIX}1{import_tags.L_FOOTNOTE_CONTENT_END}
{import_tags.L_FOOTNOTES_END}

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

        # References
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

        # Footnotes
        self.assertIn("footnotes", parsed_output)
        self.assertIsInstance(parsed_output["footnotes"], list)
        self.assertEqual(len(parsed_output["footnotes"]), 1)
        self.assertEqual(
            parsed_output["footnotes"][0],
            {"id": "1", "content": "This is the first footnote."},
        )

    @patch("import_pipeline.markdown_utils.get_unique_id", side_effect=["uid1", "uid2"])
    def test_extract_equations_to_placeholders(self, mock_get_unique_id):
        self.maxDiff = None

        with self.subTest("extracts inline and display math"):
            markdown_input = "Inline math $a=b$ and display math $$c=d$$."
            expected_text = "Inline math [[LUMI_EQUATION_uid1]] and display math [[LUMI_EQUATION_uid2]]."
            expected_map = {
                "[[LUMI_EQUATION_uid1]]": "$a=b$",
                "[[LUMI_EQUATION_uid2]]": "$$c=d$$",
            }

            # Reset mock for this subtest
            mock_get_unique_id.side_effect = ["uid2", "uid1"]

            processed_text, equation_map = (
                markdown_utils.extract_equations_to_placeholders(markdown_input)
            )

            self.assertEqual(processed_text, expected_text)
            self.assertEqual(equation_map, expected_map)

        with self.subTest("ignores escaped dollar signs"):
            markdown_input = r"This costs \$40, not $a=b$."
            expected_text = r"This costs \$40, not [[LUMI_EQUATION_uid1]]."
            expected_map = {"[[LUMI_EQUATION_uid1]]": "$a=b$"}

            mock_get_unique_id.side_effect = ["uid1"]

            processed_text, equation_map = (
                markdown_utils.extract_equations_to_placeholders(markdown_input)
            )

            self.assertEqual(processed_text, expected_text)
            self.assertEqual(equation_map, expected_map)

        with self.subTest("returns empty map for no equations"):
            markdown_input = "Just plain text."
            processed_text, equation_map = (
                markdown_utils.extract_equations_to_placeholders(markdown_input)
            )
            self.assertEqual(processed_text, markdown_input)
            self.assertEqual(equation_map, {})

    def test_substitute_equation_placeholders(self):
        with self.subTest("substitutes a single valid placeholder"):
            text = "Here is an equation: [[LUMI_EQUATION_123]]."
            placeholder_map = {"[[LUMI_EQUATION_123]]": "$E=mc^2$"}
            expected = "Here is an equation: $E=mc^2$."
            self.assertEqual(
                markdown_utils.substitute_equation_placeholders(text, placeholder_map),
                expected,
            )

        with self.subTest("substitutes multiple placeholders"):
            text = "Eq 1: [[LUMI_EQUATION_A]]. Eq 2: [[LUMI_EQUATION_B]]."
            placeholder_map = {
                "[[LUMI_EQUATION_A]]": "$a^2+b^2=c^2$",
                "[[LUMI_EQUATION_B]]": "$F=ma$",
            }
            expected = "Eq 1: $a^2+b^2=c^2$. Eq 2: $F=ma$."
            self.assertEqual(
                markdown_utils.substitute_equation_placeholders(text, placeholder_map),
                expected,
            )

        with self.subTest("handles placeholder not in map"):
            text = "This placeholder [[LUMI_EQUATION_C]] is missing."
            placeholder_map = {"[[LUMI_EQUATION_A]]": "$a=b$"}
            expected = "This placeholder  is missing."
            self.assertEqual(
                markdown_utils.substitute_equation_placeholders(text, placeholder_map),
                expected,
            )

        with self.subTest("returns original string if no placeholders"):
            text = "This string has no placeholders."
            placeholder_map = {"[[LUMI_EQUATION_A]]": "$a=b$"}
            self.assertEqual(
                markdown_utils.substitute_equation_placeholders(text, placeholder_map),
                text,
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

        with self.subTest("preserves inline math with underscores"):
            markdown_input = r"This is $\mathcal{a}_{b}$"
            expected_html = "<p>This is $\\mathcal{a}_{b}$</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("preserves block display math"):
            markdown_input = "This is a formula:\n\n$$E = mc^2$$\n\nMore text."
            expected_html = (
                "<p>This is a formula:</p>\n<p>$$E = mc^2$$</p>\n<p>More text.</p>\n"
            )
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("handles mixed inline and display math"):
            markdown_input = "Inline $a_{b}$ and display $$E=mc^2$$ math."
            expected_html = "<p>Inline $a_{b}$ and display $$E=mc^2$$ math.</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("ignores escaped dollar signs"):
            markdown_input = r"This is not an equation: \$40"
            expected_html = "<p>This is not an equation: \\$40</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("handles markdown within math"):
            markdown_input = "This is a test with an asterisk $a *b*$ inside."
            expected_html = "<p>This is a test with an asterisk $a *b*$ inside.</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

    def test_katex_substitutions(self):
        with self.subTest("replaces simple functions"):
            markdown_input = r"Some text in \normalfont{normal font} and a \mbox{box}."
            expected_html = (
                "<p>Some text in \\text{normal font} and a \\text{box}.</p>\n"
            )
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("removes label function with argument"):
            markdown_input = r"An equation \label{eq:1} with a label."
            expected_html = "<p>An equation  with a label.</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("handles multiple substitutions in one string"):
            markdown_input = r"Equation \label{eq:main} uses \normalfont."
            expected_html = "<p>Equation  uses \\text.</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

        with self.subTest("does not affect text without unsupported functions"):
            markdown_input = "This is a regular string with no substitutions."
            expected_html = "<p>This is a regular string with no substitutions.</p>\n"
            self.assertEqual(
                markdown_utils.markdown_to_html(markdown_input), expected_html
            )

    def test_postprocess_content_text(self):
        with self.subTest("test_unescape_dollar"):
            text_input = "This should be an unescaped dollar sign: \\$."
            expected = "This should be an unescaped dollar sign: $."
            self.assertEqual(
                markdown_utils.postprocess_content_text(text_input), expected
            )

        with self.subTest("test_remove_lumi_tag"):
            text_input = "This text has a [[l-some_tag]] that should be removed."
            expected = "This text has a  that should be removed."
            self.assertEqual(
                markdown_utils.postprocess_content_text(text_input), expected
            )

        with self.subTest("test_both_dollar_and_tag"):
            text_input = "A price of \\$50 [[l-price_tag]] is a good deal."
            expected = "A price of $50  is a good deal."
            self.assertEqual(
                markdown_utils.postprocess_content_text(text_input), expected
            )

        with self.subTest("test_empty_string"):
            text_input = ""
            expected = ""
            self.assertEqual(
                markdown_utils.postprocess_content_text(text_input), expected
            )

        with self.subTest("test_no_special_chars"):
            text_input = "This is a regular sentence with no special processing needed."
            self.assertEqual(
                markdown_utils.postprocess_content_text(text_input), text_input
            )

        with self.subTest("test_strip_double_brackets"):
            # Test case: Remove simple [[content]]
            text_input = "Remove this [[content]]."
            expected = "Remove this ."
            self.assertEqual(
                markdown_utils.postprocess_content_text(
                    text_input, strip_double_brackets=True
                ),
                expected,
            )

            # Test case: Do not remove when flag is False (default)
            self.assertEqual(
                markdown_utils.postprocess_content_text(text_input), text_input
            )

            # Test case: Multiple instances
            text_input_multi = "Remove [[content1]] and [[content2]]."
            expected_multi = "Remove  and ."
            self.assertEqual(
                markdown_utils.postprocess_content_text(
                    text_input_multi, strip_double_brackets=True
                ),
                expected_multi,
            )

            # Test case: Empty brackets
            text_input_empty = "Remove empty [[]]."
            expected_empty = "Remove empty ."
            self.assertEqual(
                markdown_utils.postprocess_content_text(
                    text_input_empty, strip_double_brackets=True
                ),
                expected_empty,
            )

            # Test case: No double brackets
            text_input_none = "Nothing to remove here."
            self.assertEqual(
                markdown_utils.postprocess_content_text(
                    text_input_none, strip_double_brackets=True
                ),
                text_input_none,
            )


if __name__ == "__main__":
    unittest.main()
