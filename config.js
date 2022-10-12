const StyleDictionary = require("style-dictionary");
const tinycolor = require("tinycolor2");
const fs = require("fs");

let rawdata = fs.readFileSync("./data/$metadata.json");
let tokensFolders = JSON.parse(rawdata);

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toLowerCase() + string.slice(1);
};

// shadow transformer to get box-shadow values in a css readable form
StyleDictionary.registerTransform({
  name: "shadow/css",
  type: "value",
  matcher: function (prop) {
    return prop.type === "boxShadow";
  },
  transformer: function (prop) {
    const originalValue = Array.isArray(prop.original.value)
      ? prop.original.value[0]
      : prop.original.value;
    // destructure shadow values from original token value
    const { x, y, blur, spread, color } = originalValue;

    // convert hex code to rgba string
    const shadowColor = tinycolor(color);
    shadowColor.toRgbString();

    return `${x}px ${y}px ${blur}px ${spread}px ${shadowColor}`;
  },
});

// formatter to get old color scheme
StyleDictionary.registerFormat({
  name: "css/colors",
  formatter: (dictionary, platform, options, file) => {
    const colorsProperties = dictionary.allProperties.filter(
      (item) => item.type === "color"
    );

    return `${
      options.options.theme
        ? `body[data-theme="${options.options.theme}"]`
        : ":root"
    } {
  ${colorsProperties
    .map(
      (
        prop
      ) => `--color-${prop.attributes.type}-${prop.attributes.item}: ${prop.original.value};
    `
    )
    .join("")}
}`;
  },
});

// we add our shadow/css transform to CSS predefined transformGroup https://amzn.github.io/style-dictionary/#/transform_groups?id=css
StyleDictionary.registerTransformGroup({
  name: "custom/css",
  transforms: [
    "attribute/cti",
    "name/cti/kebab",
    "size/rem",
    "color/css",
    "content/icon",
    "time/seconds",
    "shadow/css",
  ],
});

module.exports = {
  source: ["tokens/**/*.json"],
  platforms: {
    "css/category": {
      transformGroup: "custom/css",
      files: tokensFolders.tokenSetOrder.map((tokenCategory) => {
        const categoryPath = tokenCategory.split("/");

        // typography
        if (categoryPath[0] === "Core" && categoryPath[1] === "typography") {
          return {
            destination: `css/${categoryPath[0]}/${categoryPath[1]}.css`,
            format: "css/variables",
            options: {
              outputReferences: true,
            },
            filter: (token) => {
              return (
                token.filePath === "tokens/typography.json" ||
                token.path[0] === "font"
              );
            },
          };
        }

        // old dark mode color scheme
        if (
          categoryPath[0] === "deprecated" &&
          categoryPath[1] === "❌ dark-mode"
        ) {
          return {
            destination: `css/old/dark-mode.css`,
            format: "css/colors",
            options: {
              theme: "dark",
            },
            filter: (token) => {
              return token.filePath === "tokens/dark-mode.json";
            },
          };
        }

        // old light mode color scheme
        if (
          categoryPath[0] === "deprecated" &&
          categoryPath[1] === "❌ light-mode"
        ) {
          return {
            destination: `css/old/light-mode.css`,
            format: "css/colors",
            filter: (token) => {
              return token.filePath === "tokens/light-mode.json";
            },
          };
        }

        // create semantic variables just in case we need them somewhere
        if (categoryPath[0] === "Semantic" && categoryPath[1] === "light") {
          return {
            destination: `css/Semantic/light.css`,
            format: "css/variables",
            options: {
              outputReferences: true,
            },
            filter: (token) => {
              return token.filePath === "tokens/semantic.json";
            },
          };
        }

        // build rest of stylesheets based on tokens structure, it should work automatically for all new tokens
        return {
          destination: `css/${categoryPath[0]}/${categoryPath[1]}.css`,
          format: "css/variables",
          options: {
            outputReferences: true,
          },
          filter: (token) => {
            return (
              token.attributes.category ===
              (capitalizeFirstLetter(categoryPath[1]) ||
                capitalizeFirstLetter(categoryPath[0]))
            );
          },
        };
      }),
    },
  },
};
