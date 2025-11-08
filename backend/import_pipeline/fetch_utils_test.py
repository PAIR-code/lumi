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
from unittest.mock import MagicMock, patch

from import_pipeline.fetch_utils import (
    ArxivMetadata,
    check_arxiv_license,
    fetch_arxiv_metadata,
)

ARXIV_METADATA_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <link href="http://arxiv.org/api/query?search_query%3D%26id_list%3Did_1%2Cid_2%26start%3D0%26max_results%3D10" rel="self" type="application/atom+xml"/>
  <title type="html">ArXiv Query: search_query=&amp;id_list=id_1,id_2&amp;start=0&amp;max_results=10</title>
  <id>http://arxiv.org/api/TEST_FEED_ID</id>
  <updated>2025-05-13T00:00:00-04:00</updated>
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">2</opensearch:totalResults>
  <opensearch:startIndex xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">0</opensearch:startIndex>
  <opensearch:itemsPerPage xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">10</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/id_1v1</id>
    <updated>2024-01-01T00:00:00Z</updated>
    <published>2023-12-01T00:00:00Z</published>
    <title>Generic Title One</title>
    <summary>This is a summary for the first generic research paper. It describes the
methods and findings in a general way, focusing on the overall approach and
results. The content is designed to be illustrative of a typical arXiv abstract
without containing specific scientific details. It highlights the purpose, the
implementation, and the general conclusions drawn from the hypothetical
research presented. This text aims to be verbose enough to represent a realistic
summary length.</summary>
    <author>
      <name>Author One</name>
    </author>
    <author>
      <name>Author Two</name>
    </author>
    <author>
      <name>Author Three</name>
    </author>
    <arxiv:comment xmlns:arxiv="http://arxiv.org/schemas/atom">Test comment about pages and figures.</arxiv:comment>
    <link href="http://arxiv.org/abs/id_1v1" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/id_1v1" rel="related" type="application/pdf"/>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.XX" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.XX" scheme="http://arxiv.org/schemas/atom"/>
    <category term="math.YY" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/id_2v2</id>
    <updated>2024-02-01T00:00:00Z</updated>
    <published>2024-01-15T00:00:00Z</published>
    <title>Generic Title Two</title>
    <summary>This is a summary for the second generic research paper. It illustrates the
compositional aspects of the hypothetical problem solved, detailing how various
components are combined to achieve the stated goals. The approach emphasizes
modularity and scalability, making it suitable for complex systems. This abstract
serves as an example of how research contributions are typically summarized,
providing insight into the problem domain and the proposed solution's novelty.
</summary>
    <author>
      <name>Author A</name>
    </author>
    <author>
      <name>Author B</name>
    </author>
    <author>
      <name>Author C</name>
    </author>
    <author>
      <name>Author D</name>
    </author>
    <arxiv:comment xmlns:arxiv="http://arxiv.org/schemas/atom">Further test comment for a second entry.</arxiv:comment>
    <link href="http://arxiv.org/abs/id_2v2" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/id_2vv2" rel="related" type="application/pdf"/>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AB" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AB" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.YZ" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>"""


class FetchUtilsTest(unittest.TestCase):
    @patch("requests.get")
    def test_fetch_arxiv_metadata_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = ARXIV_METADATA_XML
        mock_get.return_value = mock_response

        expected_metadata_1 = ArxivMetadata(
            paper_id="id_1",
            version="1",
            authors=["Author One", "Author Two", "Author Three"],
            title="Generic Title One",
            summary="""This is a summary for the first generic research paper. It describes the
methods and findings in a general way, focusing on the overall approach and
results. The content is designed to be illustrative of a typical arXiv abstract
without containing specific scientific details. It highlights the purpose, the
implementation, and the general conclusions drawn from the hypothetical
research presented. This text aims to be verbose enough to represent a realistic
summary length.""",
            updated_timestamp="2024-01-01T00:00:00Z",
            published_timestamp="2023-12-01T00:00:00Z",
        )

        expected_metadata_2 = ArxivMetadata(
            paper_id="id_2",
            version="2",
            authors=["Author A", "Author B", "Author C", "Author D"],
            title="Generic Title Two",
            summary="""This is a summary for the second generic research paper. It illustrates the
compositional aspects of the hypothetical problem solved, detailing how various
components are combined to achieve the stated goals. The approach emphasizes
modularity and scalability, making it suitable for complex systems. This abstract
serves as an example of how research contributions are typically summarized,
providing insight into the problem domain and the proposed solution's novelty.""",
            updated_timestamp="2024-02-01T00:00:00Z",
            published_timestamp="2024-01-15T00:00:00Z",
        )

        actual_metadata = fetch_arxiv_metadata(["test_arxiv_id"])

        self.assertEqual(len(actual_metadata), 2)
        self.assertEqual(actual_metadata[0], expected_metadata_1)
        self.assertEqual(actual_metadata[1], expected_metadata_2)

    @patch("requests.get")
    def test_fetch_arxiv_metadata_failure(self, mock_get):
        import requests

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.content = ""
        mock_response.raise_for_status.side_effect = requests.HTTPError("Server error")
        mock_get.return_value = mock_response

        with self.assertRaises(requests.HTTPError):
            fetch_arxiv_metadata(["test_arxiv_id"])

    @patch("requests.get")
    def test_check_arxiv_license_valid(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = """
            <html><body>
                <a href="http://creativecommons.org/licenses/by/4.0/"></a>
            </body></html>
        """
        mock_get.return_value = mock_response
        # Should not raise an exception
        check_arxiv_license("test_id")

    @patch("requests.get")
    def test_check_arxiv_license_no_license(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = "<html><body></body></html>"
        mock_get.return_value = mock_response
        with self.assertRaisesRegex(ValueError, "No valid license found."):
            check_arxiv_license("test_id")

    @patch("requests.get")
    def test_check_arxiv_license_invalid_license(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = """
            <html><body>
                <a href="http://example.com/license"></a>
            </body></html>
        """
        mock_get.return_value = mock_response
        with self.assertRaisesRegex(ValueError, "No valid license found."):
            check_arxiv_license("test_id")

    @patch("requests.get")
    def test_check_arxiv_license_multiple_licenses(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = """
            <html><body>
                <a href="http://creativecommons.org/licenses/by/4.0/"></a>
                <a href="http://creativecommons.org/licenses/by-sa/4.0/"></a>
            </body></html>
        """
        mock_get.return_value = mock_response
        # Should not raise an exception
        check_arxiv_license("test_id")

    @patch("requests.get")
    def test_check_arxiv_license_has_invalid_license(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = """
            <html><body>
                <a href="http://creativecommons.org/licenses/by/4.0/"></a>
                <a href="https://arxiv.org/licenses/nonexclusive-distrib/1.0/"></a>
            </body></html>
        """
        mock_get.return_value = mock_response
        with self.assertRaisesRegex(
            ValueError, "Paper has a non-exclusive license and cannot be processed."
        ):
            check_arxiv_license("test_id")

    @patch("requests.get")
    def test_check_arxiv_license_flexible_url(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = """
            <html><body>
                <a href="https://creativecommons.org/licenses/by/4.0/legalcode"></a>
            </body></html>
        """
        mock_get.return_value = mock_response
        # Should not raise an exception
        check_arxiv_license("test_id")


if __name__ == "__main__":
    unittest.main()
