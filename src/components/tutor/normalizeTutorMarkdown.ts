export function normalizeTutorMarkdown(text: string): string {
  let result = text.replace(/\r\n?/g, "\n");
  const protectedParts: string[] = [];

  const protect = (value: string): string => {
    const index = protectedParts.push(value) - 1;
    return `\uE000${index}\uE001`;
  };

  const looksLikeMath = (value: string): boolean =>
    /\\(?:frac|dfrac|tfrac|sqrt|sum|int|lim|partial|cdot|times|approx|epsilon|pi|sin|cos|tan|log|ln)|[_^]\{[^}\n]+\}|_[A-Za-z0-9]|\^[A-Za-z0-9]|=/.test(
      value,
    );

  // Convert standard LaTeX delimiters.
  result = result.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (_match, formula: string) =>
      protect(`$$\n${formula.trim()}\n$$`),
  );

  result = result.replace(
    /\\\(([\s\S]*?)\\\)/g,
    (_match, formula: string) =>
      protect(`$${formula.trim()}$`),
  );

  // Convert standalone [ ... ] display-math blocks.
  result = result.replace(
    /(^|\n)\s*\[([\s\S]*?)\]\s*(?=\n|$)/g,
    (_match, prefix: string, formula: string) => {
      const trimmed = formula.trim();

      if (!looksLikeMath(trimmed)) {
        return _match;
      }

      return `${prefix}${protect(`$$\n${trimmed}\n$$`)}`;
    },
  );

  // Protect existing valid Markdown math.
  result = result.replace(
    /\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g,
    (match) => protect(match),
  );

  // Protect complete function calls such as f(x_n), f'(x_n).
  result = result.replace(
    /\b[A-Za-z][A-Za-z0-9']*\([^()\n]*?(?:\\(?:frac|sqrt|sin|cos|tan|log|ln)|[_^]\{[^}\n]+\}|_[A-Za-z0-9]|\^[A-Za-z0-9])[^()\n]*\)/g,
    (match) => protect(`$${match}$`),
  );

  // Convert parenthesized math such as (x_n), (10^{-6}), (\sqrt{2}).
  result = result.replace(
    /\(([^()\n]*(?:\\(?:frac|sqrt|sin|cos|tan|log|ln|epsilon|pi)|[_^]\{[^}\n]+\}|_[A-Za-z0-9]|\^[A-Za-z0-9]|=)[^()\n]*)\)/g,
    (_match, formula: string) => protect(`$${formula.trim()}$`),
  );

  const lines = result.split("\n");

  result = lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("```")) {
        return line;
      }

      // Do not turn Markdown table rows into display equations.
      if (trimmed.startsWith("|")) {
        return line;
      }

      // Standalone equations -> display math.
      if (
        trimmed.includes("=") &&
        looksLikeMath(trimmed) &&
        !/^#{1,6}\s/.test(trimmed) &&
        !/^[-*+]\s/.test(trimmed) &&
        !/^\d+[.)]\s/.test(trimmed) &&
        trimmed.length < 220
      ) {
        return protect(`$$\n${trimmed}\n$$`);
      }

      return line;
    })
    .join("\n");

  // Convert remaining indexed variables safely.
  // Function calls and already-renderable math are protected above.
  result = result.replace(
    /(?<![\w$])([A-Za-z](?:_\{[^}\n]+\}|_[A-Za-z0-9]|\^\{[^}\n]+\}|\^[A-Za-z0-9]))(?![\w$])/g,
    (match) => protect(`$${match}$`),
  );

  // Restore all protected sections.
  result = result.replace(
    /\uE000(\d+)\uE001/g,
    (_match, index: string) => protectedParts[Number(index)] ?? "",
  );

  return result;
}