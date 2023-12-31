import eslint from "@seadub/danger-plugin-eslint";
import { danger, warn } from "danger";
import jest from "danger-plugin-jest";
import yarn from "danger-plugin-yarn";
import * as fs from "node:fs";

import { licenseAuditor } from "@jpfulton/node-license-auditor-cli";

export default async () => {
  if (!danger.github) {
    return;
  }

  // No PR is too small to include a description of why you made a change
  if (danger.github.pr.body.length < 10) {
    warn("Please include a description of your PR changes.");
  }

  // Request changes to src also include changes to tests.
  const allFiles = danger.git.modified_files.concat(danger.git.created_files);
  const hasAppChanges = allFiles.some((p) => p.includes("src/"));
  const hasTestChanges = allFiles.some((p) => p.includes("tests/"));

  if (hasAppChanges && !hasTestChanges) {
    warn(
      "This PR does not include changes to tests, even though it affects app code."
    );
  }

  // Run Jest Plugin
  if (!fs.existsSync("test-results.json")) {
    warn(
      "Jest test results not found. Please either add a step above this action to run Jest and create a test-results.json file and/or integrate Jest and add some tests."
    );
  } else {
    jest();
  }

  // Run ESLint Plugin
  const eslintCjsConfigFile = ".eslintrc.cjs";
  const eslintJsonConfigFile = ".eslintrc.json";

  const eslintCjsConfigExists = fs.existsSync(eslintCjsConfigFile);
  const eslintJsonConfigExists = fs.existsSync(eslintJsonConfigFile);

  if (!eslintCjsConfigExists && !eslintJsonConfigExists) {
    warn(
      "ESLint configuration file not found. Please create a .eslintrc.json file at the root of the project."
    );
  } else if (eslintCjsConfigExists) {
    // use cjs eslint config if it exists
    // build an absolute path to the config file
    const eslintCjsConfigPath = `${process.cwd()}/${eslintCjsConfigFile}`;
    // load the config file as a module loaded from a file using a dynamic import
    const eslintConfig = await import(eslintCjsConfigPath);
    // pass the config to the eslint plugin
    // as a module import its top level property is the default export
    await eslint(eslintConfig.default, [".ts", ".tsx"]);
  } else if (eslintJsonConfigExists) {
    // use json eslint config if it exists
    // load the config file as a string, it will be parsed as json
    const eslintConfig = fs.readFileSync(".eslintrc.json", "utf8").toString();
    await eslint(eslintConfig, [".ts", ".tsx"]);
  }

  // Run Yarn Plugin
  if (!fs.existsSync("package.json") || !fs.existsSync("yarn.lock")) {
    warn(
      "Yarn configuration file not found. Please create a package.json and yarn.lock file at the root of the project."
    );
  }
  else {
    await yarn();
  }

  // Run License Auditor Plugin
  if (!fs.existsSync("package.json")) {
    warn(
      "Package.json file not found at root of project."
    );
  }
  else {
    if (!fs.existsSync("node_modules")) {
      warn(
        "node_modules not found at root of project. Please run 'yarn install' in the workflow prior to executing this action."
      );
    }
    else {
      // the license auditor will fail if there is no package.json file
      // or if the node_modules directory is not present from an installation
      // of the project dependencies
      await licenseAuditor({
        failOnBlacklistedLicense: false,
        projectPath: ".",
        remoteConfigurationUrl:
          "https://raw.githubusercontent.com/jpfulton/jpfulton-license-audits/main/.license-checker.json",
        showMarkdownSummary: true,
        showMarkdownDetails: true,
      });
    }
  }
};
