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
# limitations under a license.
# ==============================================================================


import bs4
from shared.lumi_doc import (
    ListContent,
    ListItem,
    LumiContent,
)
from shared.utils import get_unique_id

from import_pipeline.convert_lumi_spans import (
    create_lumi_spans,
    parse_text_and_extract_inner_tags,
)
from import_pipeline.import_utils import unescape
from import_pipeline.markdown_utils import substitute_equation_placeholders

ORDERED_LIST_TAG = "ol"
UNORDERED_LIST_TAG = "ul"
DEFAULT_LIST_TAGS = [ORDERED_LIST_TAG, UNORDERED_LIST_TAG]


def get_list_content_from_tag(
    tag: bs4.Tag,
    placeholder_map: dict[str, LumiContent],
    strip_double_brackets=False,
) -> LumiContent | None:
    """
    Returns a LumiContent object for list tags (ul, ol).
    Note: This function does not currently handle images embedded within list items.
    """

    if tag.name in DEFAULT_LIST_TAGS:
        list_items_processed = []
        # Iterate over all direct list children
        for li_tag in tag.find_all("li", recursive=False):
            # This contains all unparsed tags like <b> or [l-conc-id-N]
            raw_li_content_html = ""
            subListContent: ListContent | None = None

            for child_node in li_tag.contents:
                # If the child node is a list, process it as a nested sublist.
                # (There can only be one nested sublist per list item.)
                if child_node.name in DEFAULT_LIST_TAGS and subListContent is None:
                    nested_lumi_content_obj = get_list_content_from_tag(
                        child_node, placeholder_map
                    )
                    if nested_lumi_content_obj and nested_lumi_content_obj.list_content:
                        subListContent = nested_lumi_content_obj.list_content
                # If the child node is a <p> tag, process its contents instead of the tag itself.
                elif isinstance(child_node, bs4.Tag) and child_node.name == "p":
                    for p_child in child_node.contents:
                        raw_li_content_html += unescape(str(p_child))
                else:
                    # Otherwise, we add the child node to the raw html content.
                    raw_li_content_html += unescape(str(child_node))

            # Substitute equation placeholders before parsing for inner tags.
            raw_li_content_html = substitute_equation_placeholders(
                raw_li_content_html, placeholder_map
            )

            cleaned_li_text, li_inner_tags = parse_text_and_extract_inner_tags(
                raw_li_content_html
            )

            current_li_spans = []
            if cleaned_li_text.strip() or li_inner_tags:
                # Create the new LumiSpans from the processed text (with tags removed etc)
                # and parsed inner tags.
                current_li_spans = create_lumi_spans(
                    cleaned_li_text,
                    li_inner_tags,
                    strip_double_brackets=strip_double_brackets,
                )

            list_items_processed.append(
                ListItem(spans=current_li_spans, subListContent=subListContent)
            )

        return LumiContent(
            id=get_unique_id(),
            list_content=ListContent(
                is_ordered=(tag.name == ORDERED_LIST_TAG),
                list_items=list_items_processed,
            ),
        )
    else:
        return None
