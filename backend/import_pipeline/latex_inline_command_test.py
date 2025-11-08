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

from import_pipeline import latex_inline_command


class LatexParserTest(unittest.TestCase):
    """Tests for the internal _LatexParser class."""

    def test_parse_braces(self):
        test_cases = {
            "simple": ("{abc}def", "abc", 5),
            "nested": ("{{abc}}def", "{abc}", 7),
            "with_space": ("  {abc}  ", "abc", 7),
            "no_braces": ("abc", None, 0),
            "unmatched_open": ("{abc", None, 0),
            "escaped_inner_braces": (r"{\{a\}}", r"\{a\}", 7),
            "empty": ("{}def", "", 2),
        }
        for name, (content, expected_result, expected_pos) in test_cases.items():
            with self.subTest(name=name):
                parser = latex_inline_command.LatexParser(content)
                result = parser.parse_braces()
                self.assertEqual(result, expected_result)
                if result is not None:
                    self.assertEqual(parser.pos, expected_pos)

    def test_parse_brackets(self):
        test_cases = {
            "simple": ("[abc]def", "abc", 5),
            "with_space": ("  [abc]  ", "abc", 7),
            "no_brackets": ("abc", None, 0),
            "unmatched_open": ("[abc", None, 0),
            "empty": ("[]def", "", 2),
        }
        for name, (content, expected_result, expected_pos) in test_cases.items():
            with self.subTest(name=name):
                parser = latex_inline_command.LatexParser(content)
                result = parser.parse_brackets()
                self.assertEqual(result, expected_result)
                if result is not None:
                    self.assertEqual(parser.pos, expected_pos)

    def test_parse_command_name(self):
        test_cases = {
            "simple": (r"\abc{xyz}", r"\abc", 4),
            "non_letter_command": (r"\&{xyz}", r"\&", 2),
            "simple_with_params": (r"\abc#1{xyz}", r"\abc", 4),
            "no_command": ("abc", None, 0),
            "whitespace": (" {xyz}", None, 0),
        }
        for name, (content, expected_result, expected_pos) in test_cases.items():
            with self.subTest(name=name):
                parser = latex_inline_command.LatexParser(content)
                result = parser.parse_command_name()
                self.assertEqual(result, expected_result)
                if result is not None:
                    self.assertEqual(parser.pos, expected_pos)

    def test_parse_parameter_text(self):
        test_cases = {
            "simple": ("#1#2#3{xyz}", "#1#2#3", 6),
            "no_parameter": ("{xyz}", "", 0),
            "no_braces": ("#1#2#3", None, 0),
        }
        for name, (content, expected_result, expected_pos) in test_cases.items():
            with self.subTest(name=name):
                parser = latex_inline_command.LatexParser(content)
                result = parser.parse_parameter_text()
                self.assertEqual(result, expected_result)
                if result is not None:
                    self.assertEqual(parser.pos, expected_pos)


class LatexInlineCommandTest(unittest.TestCase):
    """Tests the public API of the latex_inline_command module."""

    def test_inline_custom_commands(self):
        test_cases = {
            "no_commands": (
                "Some text without any commands.",
                "Some text without any commands.",
            ),
            "simple_command": (
                r"\newcommand{\R}{\mathbb{R}} The set is \R.",
                r"The set is \mathbb{R}.",
            ),
            "declare_robust_command": (
                r"\DeclareRobustCommand{\Z}{\mathbb{Z}} The set is \Z.",
                r"The set is \mathbb{Z}.",
            ),
            "command_with_one_param": (
                r"\newcommand{\bb}[1]{\mathbb{#1}} The set is \bb{C}.",
                r"The set is \mathbb{C}.",
            ),
            "declare_robust_command_with_param": (
                r"\DeclareRobustCommand{\mycmd}[1]{Hello #1} Use it: \mycmd{World}.",
                r"Use it: Hello World.",
            ),
            "command_with_multiple_params": (
                r"\newcommand{\myfrac}[2]{\frac{#1}{#2}} The fraction is \myfrac{a}{b}.",
                r"The fraction is \frac{a}{b}.",
            ),
            "command_with_optional_param_used": (
                r"\newcommand{\plusbinomial}[3][2]{(#2 + #3)^#1} Use it with opt: \plusbinomial[4]{a}{b}.",
                r"Use it with opt: (a + b)^4.",
            ),
            "command_with_optional_param_default": (
                r"\newcommand{\plusbinomial}[3][2]{(#2 + #3)^#1} Use it without opt: \plusbinomial{x}{y}.",
                r"Use it without opt: (x + y)^2.",
            ),
            "nested_commands": (
                r"\newcommand{\R}{\mathbb{R}}"
                r"\newcommand{\set}[1]{The set is #1}"
                r"Here we go: \set{\R}",
                r"Here we go: The set is \mathbb{R}",
            ),
            "definition_contains_another_command": (
                r"\newcommand{\commandb}{B stuff} \newcommand{\commanda}{A stuff with \commandb} Use it: \commanda.",
                r"Use it: A stuff with B stuff.",
            ),
            "command_with_star_and_usage": (
                r"\newcommand*{\eg}{{\it e.g.}\@\xspace} This is an example, \eg, of usage.",
                r"This is an example, {\it e.g.}\@\xspace, of usage.",
            ),
            "multiple_usages": (
                r"\newcommand{\greet}[1]{Hello, #1!} \greet{World} and \greet{Universe}",
                r"Hello, World! and Hello, Universe!",
            ),
            "command_is_prefix_of_another": (
                r"\newcommand{\c}{REPLACED} This is a \command and this is \c.",
                r"This is a \command and this is REPLACED.",
            ),
            "multiline_definition": (
                "Text before.\n"
                r"\newcommand{\mycmd}[1]{" + "\n"
                r"  \textbf{#1}" + "\n"
                r"}" + "\n"
                r"Text after. Use it: \mycmd{bold}",
                "Text before.\n\nText after. Use it: \n  \\textbf{bold}\n",
            ),
            "def_style_command": (
                r"\def\calX{{\mathcal{X}}} This is an example of \calX",
                r"This is an example of {\mathcal{X}}",
            ),
            "def_style_command_with_args": (
                r"\def\myfrac#1#2{{\frac{#1}{#2}}} This is an example of \myfrac{3}{4}",
                r"This is an example of {\frac{3}{4}}",
            ),
            "def_style_with_single_non_letter_symbol": (
                r"\def\1{\mathbf{1}} \1 is in bold",
                r"\mathbf{1} is in bold",
            ),
        }

        for name, (content, expected) in test_cases.items():
            with self.subTest(name=name):
                result = latex_inline_command.inline_custom_commands(content)
                self.assertEqual(result.strip(), expected.strip())


if __name__ == "__main__":
    unittest.main()
