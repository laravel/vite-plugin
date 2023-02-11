module.exports = {
  semi: false,
  trailingComma: 'all',
  singleQuote: true,
  tabWidth: 2,
  printWidth: 120,
  overrides: [
    {
      files: ['*.yml'],
      options: {
        singleQuote: true,
      },
    },
    {
      files: ['*.json'],
      options: {
        singleQuote: false,
        quoteProps: 'preserve',
      },
    },
  ],
}
