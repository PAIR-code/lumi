// katex-directive.ts
import {
  Directive,
  directive,
  ElementPart,
  PartInfo,
  PartType,
} from "lit/directive.js";
import katex from "katex";

// This directive can be attached to an element and will render the equation param as
// LaTeX within the element using the KaTeX library.
class KatexDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);
    // Ensure this directive is used on an element part (e.g., <div ${...}>)
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("The `katex` directive must be used in an element part.");
    }
  }

  render(equationText: string) {
    // This method is primarily for directives that return a value to be rendered.
    // We will perform our side-effect in the `update` method.
  }

  // The `update` method is the core. Lit calls it when the element is first
  // rendered and whenever the directive's value changes.
  update(part: ElementPart, [equationText]: [string]) {
    // `part.element` is the DOM element the directive is attached to.
    // By the time `update` is called, this element is guaranteed to exist.
    katex.render(equationText, part.element as HTMLElement, {
      throwOnError: false,
      displayMode: false,
    });
  }
}

export const renderKatex = directive(KatexDirective);
