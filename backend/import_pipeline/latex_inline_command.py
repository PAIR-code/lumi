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
"""A utility for inlining custom LaTeX commands.

This module provides functionality to parse custom command definitions (e.g.,
`\\newcommand`, `\\DeclareRobustCommand`, `\\def`) from a LaTeX string, and then
replace all usages of these custom commands with their expanded definitions.
It is designed to handle commands with multiple arguments, optional arguments
with default values, and nested command definitions.

The main public function is `inline_custom_commands`.
"""

# A list of command definition keywords that are supported. They are expected
# to share the same syntax as \newcommand.
_SUPPORTED_COMMAND_DEFS = [r"\newcommand", r"\DeclareRobustCommand", r"\def"]


class Command:
    """A class to represent a LaTeX `\\newcommand` definition."""

    def __init__(
        self,
        name: str,
        nargs: int,
        definition: str,
        optional_default: str | None = None,
    ):
        """Initializes a Command object.

        Args:
            name: The name of the command (e.g., r'\\R').
            nargs: The number of arguments the command takes.
            definition: The replacement string for the command.
            optional_default: The default value for the first argument if it's
              optional.
        """
        self.name = name
        self.nargs = nargs
        self.definition = definition
        self.optional_default = optional_default

    def __repr__(self) -> str:
        return f"Command({self.name}, {self.nargs}, {self.definition}, {self.optional_default})"

    def __eq__(self, other):
        if not isinstance(other, Command):
            return False
        return (
            self.name == other.name
            and self.nargs == other.nargs
            and self.definition == other.definition
            and self.optional_default == other.optional_default
        )


class LatexParser:
    """A helper class to parse LaTeX structures by advancing through content."""

    def __init__(self, content: str, start_pos: int = 0):
        """Initializes the parser.

        Args:
            content: The string content to parse.
            start_pos: The initial position to start parsing from.
        """
        self.content = content
        self.pos = start_pos
        self.n = len(content)

    def _skip_space(self):
        """Advances the parser's position past any whitespace."""
        while self.pos < self.n and self.content[self.pos].isspace():
            self.pos += 1

    def parse_braces(self) -> str | None:
        """Parses content within the next pair of unescaped braces, e.g., `{...}`.

        This method correctly handles nested braces by keeping track of the brace
        level. It skips leading whitespace before looking for the opening brace.
        After a successful parse, the parser's position is updated to be after
        the closing brace.

        Returns:
            The content inside the braces as a string, or None if a matching
            pair of braces is not found.
        """
        self._skip_space()
        if self.pos >= self.n or self.content[self.pos] != "{":
            return None

        brace_level = 1
        start_brace = self.pos + 1
        j = start_brace
        while j < self.n:
            # Check for escaped characters to avoid misinterpreting \{ and \}
            if self.content[j] == "{" and self.content[j - 1] != "\\":
                brace_level += 1
            elif self.content[j] == "}" and self.content[j - 1] != "\\":
                brace_level -= 1

            if brace_level == 0:
                result = self.content[start_brace:j]
                self.pos = j + 1
                return result
            j += 1
        return None  # Unmatched brace

    def parse_brackets(self) -> str | None:
        """Parses content within the next pair of brackets, e.g., `[...]`.

        This is a simple parser that does not handle nested brackets. It is
        intended for parsing optional arguments in LaTeX commands. It skips
        leading whitespace before looking for the opening bracket. After a
        successful parse, the parser's position is updated to be after the
        closing bracket.

        Returns:
            The content inside the brackets as a string, or None if a matching
            pair of brackets is not found.
        """
        self._skip_space()
        if self.pos >= self.n or self.content[self.pos] != "[":
            return None

        try:
            end_bracket = self.content.index("]", self.pos)
            result = self.content[self.pos + 1 : end_bracket]
            self.pos = end_bracket + 1
            return result
        except ValueError:
            return None  # Unmatched bracket

    def parse_command_name(self) -> str | None:
        """Parses a LaTeX def command name directly, e.g., `\\foo` or `\\&`.

        This finds a command token (a backslash followed by either a string
        of letters or a single non-letter character) and advances the parser
        position past it.

        Returns:
            The command name as a string (e.g., r'\\foo'), or None if a
            command token is not found.
        """
        self._skip_space()
        if self.pos >= self.n or self.content[self.pos] != "\\":
            return None

        start_cmd = self.pos
        self.pos += 1  # Skip the backslash

        if self.pos >= self.n:
            return None

        if self.content[self.pos].isalpha():
            while self.pos < self.n and self.content[self.pos].isalpha():
                self.pos += 1
        elif self.content[self.pos] != " ":
            # Command is a single non-letter symbol (e.g., \&)
            self.pos += 1

        return self.content[start_cmd : self.pos]

    def parse_parameter_text(self) -> str | None:
        """Parses the parameter text of a LaTeX def command."""
        # Find parameter text (e.g., #1#2)
        # to do this we find the opening brace of the definition
        self._skip_space()
        brace_pos = -1
        param_start = self.pos
        while self.pos < self.n:
            char = self.content[self.pos]
            if char == "{":
                brace_pos = self.pos
                break
            elif char == "\\" and self.pos + 1 < self.n:
                self.pos += 1  # Skip next character (escaped)
            self.pos += 1
        if brace_pos == -1:  # No definition brace found
            return None
        param_text = self.content[param_start:brace_pos]
        return param_text


def _find_next_command_def(content: str, start_pos: int) -> tuple[str, int] | None:
    """Finds the earliest occurrence of any supported command definition."""
    found_command = None
    start_index = -1

    for cmd in _SUPPORTED_COMMAND_DEFS:
        idx = content.find(cmd, start_pos)
        if idx != -1 and (start_index == -1 or idx < start_index):
            start_index = idx
            found_command = cmd

    if found_command:
        return found_command, start_index
    return None


def _get_command_from_def_style(
    parser: LatexParser, found_command: str
) -> tuple[str, int, str] | None:
    name = parser.parse_command_name()
    if name is None:
        return None

    param_text = parser.parse_parameter_text()
    if param_text is None:
        return None

    # Count arguments by finding the highest #N in the param text
    j = 0
    nargs = 0
    while j < len(param_text):
        if (
            param_text[j] == "#"
            and j + 1 < len(param_text)
            and param_text[j + 1].isdigit()
        ):
            digit = int(param_text[j + 1])
            if 1 <= digit <= 9:
                nargs = max(nargs, digit)
                j += 1  # Skip the digit
        j += 1

    definition = parser.parse_braces()
    return (name, nargs, definition)


def find_and_parse_commands(content: str) -> list[Command]:
    """Finds and parses all custom command definitions in a string.

    This function scans the input content for command definitions like
    `\\newcommand` and `\\def`, and extracts their name, number of arguments,
    optional default value, and the definition body.

    Args:
        content: The LaTeX content to search.

    Returns:
        A list of Command objects representing the parsed definitions.
    """
    commands = []
    i = 0
    while i < len(content):
        match = _find_next_command_def(content, i)
        if match is None:
            break

        found_command, start_index = match
        parser_start_pos = start_index + len(found_command)
        # Check for an optional star `*` which can follow \newcommand.
        # We can just skip it as it doesn't affect argument parsing for our needs.
        if (
            found_command != r"\def"
            and parser_start_pos < len(content)
            and content[parser_start_pos] == "*"
        ):
            parser_start_pos += 1

        parser = LatexParser(content, parser_start_pos)

        name = None
        nargs = 0
        definition = None
        optional_default = None

        if found_command == r"\def":
            # --- Handle \def syntax: \def\name<params>{definition} ---

            command_details = _get_command_from_def_style(parser, found_command)

            if command_details is None:
                continue

            name, nargs, definition = command_details
            optional_default = None
        else:
            # --- Handle \newcommand syntax: \cmd{name}[nargs][opt]{def} ---

            # 1. Parse the command name, which is required (e.g., `{\\R}`).
            name = parser.parse_braces()
            if name is None:
                # If parsing fails, advance past the command to avoid infinite loop.
                i = start_index + len(found_command)
                continue

            # 2. Parse the optional number of arguments (e.g., `[1]`).
            nargs_str = parser.parse_brackets()
            if nargs_str is not None:
                try:
                    nargs = int(nargs_str)
                except (ValueError, TypeError):
                    nargs = 0  # Not a valid number, assume 0 args.
            else:
                nargs = 0

            # 3. Parse the optional default value for the first argument (e.g., `[default]`).
            optional_default = parser.parse_brackets()

            # 4. Parse the command definition, which is required (e.g., `{\\mathbb{R}}`).
            definition = parser.parse_braces()
        if definition is None:
            i = start_index + len(found_command)
            continue

        commands.append(Command(name, nargs, definition, optional_default))
        # Move the search position past the successfully parsed command.
        i = parser.pos

    return commands


def _find_command_usage(
    content: str, command: Command, start_index: int
) -> tuple[int, int, list[str]] | None:
    r"""Finds the next usage of a command and parses its arguments.

    This function searches for an occurrence of the command's name, ensuring it
    is not a prefix of a longer command (e.g., `\c` does not match `\command`).
    It then attempts to parse the expected number of arguments (both optional
    and required) that follow it.

    Args:
        content: The string to search within.
        command: The Command object to find a usage of.
        start_index: The position in the content to start searching from.

    Returns:
        A tuple containing:
          - The start index of the command usage (including the command name).
          - The end index of the command usage (after all arguments).
          - A list of parsed argument strings.
        Returns None if no valid usage is found.
    """
    search_pos = start_index
    while True:
        match_start = content.find(command.name, search_pos)
        if match_start == -1:
            return None

        # If the command name ends in a letter, ensure it's not just a prefix
        # of a longer command name. E.g., `\c` should not match `\command`.
        if command.name[-1].isalpha():
            char_after_match_idx = match_start + len(command.name)
            if (
                char_after_match_idx < len(content)
                and content[char_after_match_idx].isalpha()
            ):
                # It's a prefix of a longer command. Skip this match and
                # continue searching from the next character.
                search_pos = match_start + 1
                continue

        # This looks like a valid command. Now parse arguments.
        parser = LatexParser(content, match_start + len(command.name))
        args = []

        num_req_args = command.nargs
        if command.optional_default is not None:
            # Check for an optional argument provided in brackets.
            optional_arg = parser.parse_brackets()
            if optional_arg is not None:
                args.append(optional_arg)
            else:
                # Optional argument is not present, so use the default.
                args.append(command.optional_default)
            num_req_args -= 1

        all_args_found = True
        for _ in range(num_req_args):
            required_arg = parser.parse_braces()
            if required_arg is None:
                all_args_found = False
                break
            args.append(required_arg)

        if all_args_found:
            return match_start, parser.pos, args
        else:
            # Argument parsing failed. Continue searching from after this
            # failed match.
            search_pos = match_start + 1


def replace_command_usages(content: str, command: Command) -> str:
    """Replaces all usages of a given command in the content string.

    This function finds all occurrences of the specified command, parses their
    arguments, and replaces the entire command usage with its definition,
    substituting placeholders like #1, #2 with the parsed arguments.

    Args:
        content: The string in which to perform replacements.
        command: The Command to replace.

    Returns:
        A new string with all usages of the command replaced.
    """
    output = []
    i = 0
    while i < len(content):
        result = _find_command_usage(content, command, i)
        if result is None:
            # No more usages found, append the rest of the content.
            output.append(content[i:])
            break

        match_start, match_end, args = result

        # Append the content that comes before the command usage.
        output.append(content[i:match_start])

        # Perform the replacement by substituting arguments into the definition.
        definition = command.definition
        for idx, arg in enumerate(args):
            placeholder = f"#{idx + 1}"
            definition = definition.replace(placeholder, arg)
        output.append(definition)

        # Move the main index past the command usage we just processed.
        i = match_end

    return "".join(output)


def remove_custom_definitions(content: str) -> str:
    """Removes all custom command definitions from the content.

    This function scans the content for command definition blocks (like
    `\\newcommand` and `\\def`) and removes them,
    correctly handling the different syntaxes to ensure the entire definition
    is removed.

    Args:
        content: The LaTeX content string.

    Returns:
        A new string with all custom command definitions removed.
    """
    output = []
    i = 0
    n = len(content)
    while i < n:
        match = _find_next_command_def(content, i)
        if match is None:
            # No more commands, append the rest of the string and finish.
            output.append(content[i:])
            break

        found_command, start_index = match
        # Append the text that comes before this command definition.
        output.append(content[i:start_index])

        parser_start_pos = start_index + len(found_command)
        # Check for an optional star `*` and skip it.
        if parser_start_pos < n and content[parser_start_pos] == "*":
            parser_start_pos += 1

        parser = LatexParser(content, parser_start_pos)

        if found_command == r"\def":
            # --- Skip \def syntax ---

            # 1. Skip over the command name.
            if parser.parse_command_name() is None:
                i = start_index + len(found_command)
                continue

            # 2. Skip over param text.
            parser.parse_parameter_text()

            # 3. Skip over the main definition body.
            if parser.parse_braces() is None:
                i = start_index + len(found_command)
                continue

        else:
            # --- Skip \newcommand syntax  ---

            # 1. Skip over the command name.
            if parser.parse_braces() is None:
                i = start_index + len(found_command)
                continue

            # 2. Skip optional number of arguments
            parser.parse_brackets()

            # 3. Skip optional default value
            parser.parse_brackets()

            # 4. Skip over the main definition body.
            if parser.parse_braces() is None:
                i = start_index + len(found_command)
                continue

        # Move the main index to the position after the parsed definition.
        i = parser.pos

    return "".join(output)


def inline_custom_commands(content: str) -> str:
    """Finds and replaces all custom command usages in LaTeX content.

    This function first parses all custom command definitions (e.g.,
    `\\newcommand`) from the input string. It then removes these definitions and
    iteratively replaces all usages of the custom commands with their
    corresponding definitions.

    The process is iterative to handle nested commands, where one custom
    command is defined in terms of another.

    Args:
        content: The LaTeX content as a string.

    Returns:
        The content with all custom commands inlined and their definitions
        removed.
    """
    # First, find all command definitions in the original content.
    commands = find_and_parse_commands(content)
    if not commands:
        return content

    # Then, remove the \newcommand definitions from the content to get a
    # clean slate for replacements.
    content_no_defs = remove_custom_definitions(content)

    max_iterations = 10  # A safeguard against potential infinite loops.
    for _ in range(max_iterations):
        previous_content = content_no_defs
        for command in commands:
            content_no_defs = replace_command_usages(content_no_defs, command)

        # If a full pass results in no changes, we're done.
        if content_no_defs == previous_content:
            break

    return content_no_defs.strip()
