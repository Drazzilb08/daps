export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-selector-bem-pattern'],
  ignoreFiles: [
    'src/css/utilities.css', // Preserve compact formatting for readability
  ],
  rules: {
    // BEM class naming: block, block__element, block--modifier, block__element--modifier
    // Also allow utility classes with special patterns for responsive/fraction utilities
    'selector-class-pattern': [
      '^(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?|(?:sm|md|lg|xl)\\:[a-z0-9-]+|[a-z0-9-]+\\/[0-9])$',
      {
        message:
          'Class selectors should be written in BEM (block__element--modifier) style (lowercase, no special chars except _ and -), or be utility classes.',
      },
    ],
    // BEM discourages IDs
    'selector-id-pattern': null,
    // Shallow nesting for maintainability
    'max-nesting-depth': 2,
  },
};