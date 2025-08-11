export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-selector-bem-pattern'],
  rules: {
    // BEM class naming: block, block__element, block--modifier, block__element--modifier
    'selector-class-pattern': [
      '^[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$',
      {
        message:
          'Class selectors should be written in BEM (block__element--modifier) style (lowercase, no special chars except _ and -).',
      },
    ],
    // BEM discourages IDs
    'selector-id-pattern': null,
    // Shallow nesting for maintainability
    'max-nesting-depth': 2,
  },
};