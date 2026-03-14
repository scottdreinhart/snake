module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation changes
        'style',     // Code style changes (formatting, missing semicolons, etc.)
        'refactor',  // Code refactoring without changing functionality
        'perf',      // Performance improvements
        'test',      // Adding or updating tests
        'chore',     // Build, CI, dependencies, tooling
        'a11y',      // Accessibility improvements
        'security',  // Security fixes
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'scope-case': [2, 'always', 'lower-case'],
  },
}
