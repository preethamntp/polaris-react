// eslint-disable-next-line node/no-unsupported-features/node-builtins
const assert = require('assert').strict;
const fs = require('fs');

const glob = require('glob');

const packageJSON = require('../package.json');

// Validation to assert the output of the build.

validateStandardBuild();
validateEsNextBuild();
validateSassPublicApi();
validateAncillaryOutput();
validateVersionReplacement();

function validateStandardBuild() {
  // Standard build
  assert.ok(fs.existsSync('./build/cjs/index.js'));
  assert.ok(fs.existsSync('./build/esm/index.js'));
  assert.ok(fs.existsSync('./build/esm/styles.css'));

  // Assert it uses named exports rather than properties from the React default
  // export to help tree-shaking.
  // React.createElement and React.Fragment are the allowed exceptions
  const files = glob.sync('./build/cjs/**/*.js');
  assert.notStrictEqual(files.length, 0);
  const filesContainingUnwantedReactUsage = [];
  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8');

    const unwantedReactUsageMatches =
      content.match(
        /React__default\['default'\]\.(?!createElement|Fragment)[A-Za-z0-9]+/g,
      ) || [];

    if (unwantedReactUsageMatches.length) {
      filesContainingUnwantedReactUsage.push(file);
    }
  });

  assert.deepStrictEqual(filesContainingUnwantedReactUsage, []);

  // Standard build css contains namespaced classes
  const cssContent = fs.readFileSync('./build/esm/styles.css', 'utf-8');
  assert.ok(cssContent.includes('.Polaris-Avatar {'));
  assert.ok(cssContent.includes('.Polaris-BulkActions__BulkActionButton {'));
}

function validateEsNextBuild() {
  // ESnext build
  assert.ok(fs.existsSync('./build/esnext/index.esnext'));
  assert.ok(fs.existsSync('./build/esnext/components/Avatar/Avatar.esnext'));
  assert.ok(fs.existsSync('./build/esnext/components/Avatar/Avatar.css'));

  // ESnext build css contains namespaced classes, and
  const cssContent = fs.readFileSync(
    './build/esnext/components/Avatar/Avatar.css',
    'utf-8',
  );
  assert.ok(cssContent.includes('.Polaris-Avatar_z763p {'));

  const jsContent = fs.readFileSync(
    './build/esnext/components/Avatar/Avatar.scss.esnext',
    'utf-8',
  );

  assert.ok(jsContent.includes("import './Avatar.css';"));
  assert.ok(jsContent.includes('"Avatar": "Polaris-Avatar_z763p"'));
  assert.ok(jsContent.includes('"hidden": "Polaris-Avatar--hidden_riqie"'));
}

function validateSassPublicApi() {
  assert.ok(fs.existsSync('./build/styles/_public-api.scss'));
  assert.ok(fs.existsSync('./build/styles/foundation/_spacing.scss'));

  // does not contain any :global definitions
  const files = glob.sync(`./build/styles/**/*.scss`);
  assert.notStrictEqual(files.length, 0);

  const filesWithGlobalDefinitions = files.filter((file) => {
    return fs.readFileSync(file, 'utf-8').includes(':global');
  });

  assert.deepStrictEqual(filesWithGlobalDefinitions, []);
}

function validateAncillaryOutput() {
  assert.ok(fs.existsSync('./build/ts/latest/src/index.d.ts'));
  // Downleveled for consumers on older TypeScript versions
  assert.ok(fs.existsSync('./build/ts/3.4/src/index.d.ts'));
}

function validateVersionReplacement() {
  const files = glob.sync('./build/**/*.{js,mjs,esnext,css,scss}');

  assert.notStrictEqual(files.length, 0);

  const fileBuckets = {
    includesTemplateString: [],
    includesVersion: [],
  };

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8');

    if (content.includes('POLARIS_VERSION')) {
      fileBuckets.includesTemplateString.push(file);
    }

    if (content.includes(packageJSON.version)) {
      fileBuckets.includesVersion.push(file);
    }
  });

  assert.strictEqual(fileBuckets.includesTemplateString.length, 0);

  assert.deepStrictEqual(fileBuckets.includesVersion, [
    './build/cjs/configure.js',
    './build/esm/configure.js',
    './build/esm/styles.css',
    './build/esnext/components/AppProvider/AppProvider.css',
    './build/esnext/configure.esnext',
  ]);
}
