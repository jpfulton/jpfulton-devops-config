import { danger, warn } from "danger";
import * as fs from "node:fs";

import { javaLicenseAuditor } from "@jpfulton/java-license-auditor-cli";

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
  const hasAppChanges = allFiles.some((p) => p.includes("src/main/"));
  const hasTestChanges = allFiles.some((p) => p.includes("src/test/"));

  if (hasAppChanges && !hasTestChanges) {
    warn(
      "This PR does not include changes to tests, even though it affects app code."
    );
  }

  // Run the Java License Auditor Plugin
  const mavenDependenciesReportFile = "target/site/dependencies.html";
  if (!fs.existsSync(mavenDependenciesReportFile)) {
    warn(
      "Maven dependencies report not found. Please either add a step above this action to run Maven and create a dependencies.html file and/or integrate Maven and add some dependencies."
    );
  } else {
    await javaLicenseAuditor({
      failOnBlacklistedLicense: false,
      projectPath: ".",
      remoteConfigurationUrl:
        "https://raw.githubusercontent.com/jpfulton/jpfulton-license-audits/main/.license-checker.json",
      showMarkdownDetails: true,
      showMarkdownSummary: true,
    });
  }
};