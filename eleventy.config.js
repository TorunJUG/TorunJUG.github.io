export default function (eleventyConfig) {
  // Pliki kopiowane 1:1 do _site (bez przetwarzania).
  for (const path of ["static", "wydarzenia", "styles.css", "script.js", "robots.txt", "CNAME"]) {
    eleventyConfig.addPassthroughCopy({ [`src/${path}`]: path });
  }

  // Domyślnie Eleventy nie escapuje HTML-a w Nunjucks – włączamy, żeby dane z JSON-ów
  // były zawsze bezpieczne. Surowy HTML/JSON wstawiamy jawnie filtrem `safe` lub `jsonLd`.
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true, throwOnUndefined: true });

  // JSON-LD do <script type="application/ld+json"> (bez możliwości zamknięcia znacznika).
  eleventyConfig.addFilter("jsonLd", (value) =>
    JSON.stringify(value, null, 2).replaceAll("<", "\\u003c"),
  );

  // „1 nagranie”, „2 nagrania”, „5 nagrań”.
  eleventyConfig.addFilter("recordingsLabel", (count) => {
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    if (count === 1) return "1 nagranie";
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} nagrania`;
    return `${count} nagrań`;
  });

  eleventyConfig.addFilter("floorTo", (value, step) => Math.floor(value / step) * step);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    // Tylko pliki .njk są szablonami; wszystko inne trafia na stronę przez passthrough.
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
