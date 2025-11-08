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
"""A single source of truth for all import tags and regex patterns."""

import re

from shared.lumi_doc import InnerTagName

# ==============================================================================
# Section Tags
# ==============================================================================
L_TITLE_START = "[[l-tit]]"
L_TITLE_END = "[[l-tit]]"
L_AUTHORS_START = "[[l-aut]]"
L_AUTHORS_END = "[[l-aut]]"
L_ABSTRACT_START = "[[l-abs]]"
L_ABSTRACT_END = "[[l-abs]]"
L_CONTENT_START = "[[l-con]]"
L_CONTENT_END = "[[l-con]]"
L_REFERENCES_START = "[[l-refs-start]]"
L_REFERENCES_END = "[[l-refs-end]]"
L_FOOTNOTES_START = "[[l-footnotes-start]]"
L_FOOTNOTES_END = "[[l-footnotes-end]]"

# ==============================================================================
# Item Tags (within sections)
# ==============================================================================
L_REFERENCE_ITEM_START_PREFIX = "[[l-ref-"
L_REFERENCE_ITEM_END = "]]"
L_REFERENCE_ITEM_END_GENERIC = "[[l-ref]]"
L_CONCEPT_START_PREFIX = "[[l-conc-"
L_CONCEPT_END = "]]"
L_CITATION_START_PREFIX = "[[l-cit-"
L_CITATION_END = "]]"
L_IMG_START_PREFIX = "[[l-image_"
L_IMG_END = "]]"
L_IMG_CAP_START_PREFIX = "[[l-image_cap_"
L_IMG_CAP_END = "]]"
L_HTML_START_PREFIX = "[[l-html_"
L_HTML_END = "]]"
L_HTML_CAP_START_PREFIX = "[[l-html_cap_"
L_HTML_CAP_END = "]]"
L_FIG_START_PREFIX = "[[l-fig-start-"
L_FIG_END_PREFIX = "[[l-fig-end-"
L_FIG_END = "]]"
L_FIG_CAP_START_PREFIX = "[[l-fig-cap-"
L_FIG_CAP_END = "]]"
L_FOOTNOTE_MARKER_PREFIX = "[[l-foot-"
L_FOOTNOTE_MARKER_END = "]]"
L_FOOTNOTE_CONTENT_START_PREFIX = "[[l-footnote-start-"
L_FOOTNOTE_CONTENT_END_PREFIX = "[[l-footnote-end-"
L_FOOTNOTE_CONTENT_END = "]]"


# ==============================================================================
# Span Reference Tags (for answers)
# ==============================================================================
S_REF_START_PREFIX = "[[l-sref-"
S_REF_END = "]]"

# ==============================================================================
# Regex Patterns for Parsing
# ==============================================================================


# Section Patterns
# Explanation of regex used:
#  - <tag>(.*?)</tag>:
#       - `.` matches any character (usually without line terminators, but we use re.DOTALL)
#       - `*?` matches the previous token between 0 and unlimited times (lazy)
#       - `<tag>` and `</tag>` are matched literally (so we extract all text between these 2 tags)
L_TITLE_PATTERN = re.compile(
    rf"{re.escape(L_TITLE_START)}(.*?){re.escape(L_TITLE_END)}", re.DOTALL
)
L_AUTHORS_PATTERN = re.compile(
    rf"{re.escape(L_AUTHORS_START)}(.*?){re.escape(L_AUTHORS_END)}", re.DOTALL
)
L_ABSTRACT_PATTERN = re.compile(
    rf"{re.escape(L_ABSTRACT_START)}(.*?){re.escape(L_ABSTRACT_END)}", re.DOTALL
)
L_CONTENT_PATTERN = re.compile(
    rf"{re.escape(L_CONTENT_START)}(.*?){re.escape(L_CONTENT_END)}", re.DOTALL
)
L_REFERENCES_PATTERN = re.compile(
    rf"{re.escape(L_REFERENCES_START)}(.*?){re.escape(L_REFERENCES_END)}", re.DOTALL
)
L_FOOTNOTES_PATTERN = re.compile(
    rf"{re.escape(L_FOOTNOTES_START)}(.*?){re.escape(L_FOOTNOTES_END)}", re.DOTALL
)


# Inner Content Patterns
# Explanation of regex used:
#  - <tag>(?P<content>.*?)</tag>:
#       - `?P<content>`` makes this a named capturing group with name 'content'
#       - `.` matches any character (usually without line terminators, but we use re.DOTALL)
#       - `*?` matches the previous token between 0 and unlimited times (lazy)
#       - `<tag>` and `</tag>` are matched literally (so we extract all text between these 2 tags)
#  - (?P<id>.*?):
#       - `?P<id>` makes this a named capturing group with name 'id'
#       - `.*?` matches any character between 0 and unlimited times (lazy)
#  - (?P=id):
#       - (?P=id): matches the exact same text as previously matched by the named group 'id'
L_CONCEPT_PATTERN = re.compile(
    rf"{re.escape(L_CONCEPT_START_PREFIX)}(?P<id>.*?){re.escape(L_CONCEPT_END)}(?P<content>.*?){re.escape(L_CONCEPT_START_PREFIX)}(?P=id){re.escape(L_CONCEPT_END)}",
    re.DOTALL,
)
L_CITATION_PATTERN = re.compile(
    rf"{re.escape(L_CITATION_START_PREFIX)}(?P<id>.*?){re.escape(L_CITATION_END)}",
    re.DOTALL,
)
L_FOOTNOTE_MARKER_PATTERN = re.compile(
    rf"{re.escape(L_FOOTNOTE_MARKER_PREFIX)}(?P<id>.*?){re.escape(L_FOOTNOTE_MARKER_END)}",
    re.DOTALL,
)
S_REF_PATTERN = re.compile(
    rf"{re.escape(S_REF_START_PREFIX)}(?P<id>.*?){re.escape(S_REF_END)}", re.DOTALL
)


# Item Patterns
# Captures 2 capturing groups containing the ID and the text content
L_REFERENCE_ITEM_PATTERN = re.compile(
    rf"{re.escape(L_REFERENCE_ITEM_START_PREFIX)}(.*?){re.escape(L_REFERENCE_ITEM_END)}(.*?){re.escape(L_REFERENCE_ITEM_END_GENERIC)}",
    re.DOTALL,
)
L_FOOTNOTE_CONTENT_PATTERN = re.compile(
    rf"{re.escape(L_FOOTNOTE_CONTENT_START_PREFIX)}(?P<id>.*?){re.escape(L_FOOTNOTE_CONTENT_END)}(?P<content>.*?){re.escape(L_FOOTNOTE_CONTENT_END_PREFIX)}(?P=id){re.escape(L_FOOTNOTE_CONTENT_END)}",
    re.DOTALL,
)

# Figure/Image/Table Patterns
# Explanation of regex used:
#  - `(?P<image_path>.*?)`: Named group 'image_path' that non-greedily captures the path.
#  - `(?:`: Start of optional non-capturing group
#  - `\s*` - Optional whitespace between image and caption tags
#  - (?P=image_path) is a backreference to ensure the ID matches the image path.
#  - `(?P<image_caption_text>.*?)` - The caption text itself. Non-greedy to stop at the first end-caption tag.
IMAGE_AND_CAPTION_PATTERN = re.compile(
    rf"""
    (
      {re.escape(L_IMG_START_PREFIX)}(?P<image_path>.*?){re.escape(L_IMG_END)}
      (?:
          \s*
          {re.escape(L_IMG_CAP_START_PREFIX)}(?P=image_path){re.escape(L_IMG_CAP_END)}
          (?P<image_caption_text>.*?)
          {re.escape(L_IMG_CAP_START_PREFIX)}(?P=image_path){re.escape(L_IMG_CAP_END)}
      )?
    )
    """,
    re.VERBOSE | re.DOTALL,
)

# Explanation of regex used:
#  - `(?P<figure_id>.*?)`: Named group 'figure_id' that non-greedily captures the figure id.
#  - `(?:`: Start of optional non-capturing group
#  - `\s*` - Optional whitespace between image and caption tags
#  - (?P=figure_id) is a backreference to ensure the ID matches the image path.
#  - `(?P<html_caption_text>.*?)` - The caption text itself. Non-greedy to stop at the first end-caption tag.
HTML_FIGURE_PATTERN = re.compile(
    rf"""
    (
      {re.escape(L_HTML_START_PREFIX)}(?P<figure_id>.*?){re.escape(L_HTML_END)}
      (?P<html_content>.*?)
      {re.escape(L_HTML_START_PREFIX)}(?P=figure_id){re.escape(L_HTML_END)}
      (?:
          \s*
          {re.escape(L_HTML_CAP_START_PREFIX)}(?P=figure_id){re.escape(L_HTML_CAP_END)}
          (?P<html_caption_text>.*?)
          {re.escape(L_HTML_CAP_START_PREFIX)}(?P=figure_id){re.escape(L_HTML_CAP_END)}
      )?
    )
    """,
    re.VERBOSE | re.DOTALL,
)


# Explanation of regex used:
#  - `(?P<figure_id>.*?)`: Named group 'figure_id' that non-greedily captures the figure id.
#  - `(?P<figure_content>.*?)`: Named group 'figure_content' that non-greedily captures the content of the figure.
#  - `(?:`: Start of optional non-capturing group
#  - `\s*` - Optional whitespace between image and caption tags
#  - (?P=figure_id) is a backreference to ensure the ID matches the image path.
#  - `(?P<main_caption_text>.*?)` - The caption text itself. Non-greedy to stop at the first end-caption tag.
FIGURE_PATTERN = re.compile(
    rf"""
    (
        {re.escape(L_FIG_START_PREFIX)}(?P<figure_id>.*?){re.escape(L_FIG_END)}
        (?P<figure_content>.*?)
        {re.escape(L_FIG_END_PREFIX)}(?P=figure_id){re.escape(L_FIG_END)}
        (?:
            \s*
            {re.escape(L_FIG_CAP_START_PREFIX)}(?P=figure_id){re.escape(L_FIG_CAP_END)}
            (?P<main_caption_text>.*?)
            {re.escape(L_FIG_CAP_START_PREFIX)}(?P=figure_id){re.escape(L_FIG_CAP_END)}
        )?
    )
    """,
    re.VERBOSE | re.DOTALL,
)

MATH_DISPLAY_PATTERN = re.compile(
    r"(?<!\\)\$(?<!\\)\$(?P<content>.*?)(?<!\\)\$(?<!\\)\$", re.DOTALL
)

MATH_PATTERN = re.compile(r"(?<!\\)\$(?P<content>.*?)(?<!\\)\$", re.DOTALL)

TAG_DEFINITIONS = [
    {
        "name": InnerTagName.CONCEPT,
        "pattern": L_CONCEPT_PATTERN,
        "metadata_extractor": lambda m: {"id": m.group("id")},
    },
    {
        "name": InnerTagName.REFERENCE,
        "pattern": L_CITATION_PATTERN,
        "metadata_extractor": lambda m: {"id": m.group("id")},
    },
    {
        "name": InnerTagName.FOOTNOTE,
        "pattern": L_FOOTNOTE_MARKER_PATTERN,
        "metadata_extractor": lambda m: {"id": m.group("id")},
    },
    {
        "name": InnerTagName.SPAN_REFERENCE,
        "pattern": S_REF_PATTERN,
        "metadata_extractor": lambda m: {"id": m.group("id")},
    },
    {
        "name": InnerTagName.A,
        "pattern": re.compile(
            r'<a href="(?P<href>.*?)">(?P<content>.*?)</a>', re.DOTALL
        ),
        "metadata_extractor": lambda m: {"href": m.group("href")},
    },
    {
        "name": InnerTagName.CODE,
        "pattern": re.compile(r"<code>(?P<content>.*?)</code>", re.DOTALL),
        "metadata_extractor": lambda m: {},
    },
    {
        "name": InnerTagName.BOLD,
        "pattern": re.compile(r"<b>(?P<content>.*?)</b>", re.DOTALL),
        "metadata_extractor": lambda m: {},
    },
    {
        "name": InnerTagName.STRONG,
        "pattern": re.compile(r"<strong>(?P<content>.*?)</strong>", re.DOTALL),
        "metadata_extractor": lambda m: {},
    },
    {
        "name": InnerTagName.ITALIC,
        "pattern": re.compile(r"<i>(?P<content>.*?)</i>", re.DOTALL),
        "metadata_extractor": lambda m: {},
    },
    {
        "name": InnerTagName.EM,
        "pattern": re.compile(r"<em>(?P<content>.*?)</em>", re.DOTALL),
        "metadata_extractor": lambda m: {},
    },
    {
        "name": InnerTagName.UNDERLINE,
        "pattern": re.compile(r"<u>(?P<content>.*?)</u>", re.DOTALL),
        "metadata_extractor": lambda m: {},
    },
    {
        "name": InnerTagName.MATH_DISPLAY,
        "pattern": MATH_DISPLAY_PATTERN,
        "metadata_extractor": lambda m: {},
    },
    {
        "name": InnerTagName.MATH,
        "pattern": MATH_PATTERN,
        "metadata_extractor": lambda m: {},
    },
]
