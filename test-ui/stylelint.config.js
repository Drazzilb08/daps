export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-selector-bem-pattern'],
  overrides: [
    {
      files: ['src/css/utilities/**/*.css'],
      rules: {
        // Turn off rules you don't want enforced here
        'selector-class-pattern': null,
        'max-nesting-depth': null,
        // Disable all formatting rules that would conflict with custom single-line format
        // Prettier is excluded via .prettierignore, Stylelint should only lint, not format
      },
    },
  ],
  rules: {
    'selector-class-pattern': [
      '^(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?|(?:sm|md|lg|xl)\\:[a-z0-9-]+|[a-z0-9-]+\\/[0-9])$',
      {
        message:
          'Class selectors should be written in BEM (block__element--modifier) style (lowercase, no special chars except _ and -), or be utility classes.',
      },
    ],
    'selector-id-pattern': null,
    'max-nesting-depth': 2,
  },
};