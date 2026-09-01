module.exports = {
  default: {
    require: ['e2e/step-definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'json:test-results/cucumber-report.json',
      'html:test-results/cucumber-report.html',
    ],
    parallel: 2,
    formatOptions: { snippetInterface: 'async-await' },
  },
};
