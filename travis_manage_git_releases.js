"use strict"

const fs = require("fs");
const request = require("request");

const gitHubUser = process.env.GITHUB_USER;
const gitHubRepo = process.env.GITHUB_REPO;
const gitHubKey = process.env.GITHUB_API_KEY;
const version = fs.readFileSync("VERSION", {
  encoding: "utf8"
});
const isPreRelease = +version.split(".")[1] & 1 == 1;
const buildNumber = +process.env.TRAVIS_BUILD_NUMBER;

const baseApiUrl = "https://" + gitHubUser + ":" + gitHubKey + "@api.github.com/";
const listReleases = baseApiUrl + "repos/" + gitHubUser + "/" + gitHubRepo + "/releases";
const modifyRelease = baseApiUrl + "repos/" + gitHubUser + "/" + gitHubRepo + "/releases/";

console.log("Requesting list of all GitHub releases");

let options = {
  url: listReleases,
  headers: {
    "User-Agent": "g0ne-TravisCI"
  }
};

let errorFunc = (err, resp, body, statusCode, message) => {
  if (err || response.statusCode != statusCode) {
    console.error(message);
    if (response)
      console.error("Status code:", response.statusCode);
    return true;
  }
  return false;
}

request.get(options, (err, response, body) => {
  if (errorFunc(err, response, body, 200, "Error getting a list of all GitHub releases"))
    return;

  let releases;
  try {
    releases = JSON.parse(body);
  } catch (e) {
    console.error("Error parsing the JSON body:");
    console.error(body);
    return;
  }

  console.log("Retrieved list, deleting deprecated ones");
  console.log("Total #releases:", releases.length);

  let deprecatedReleases = 0;
  releases.forEach(release => {
    const releaseVersion = release.tag_name.split("-")[0];
    const releaseBuildNumber = +release.tag_name.split("-")[1];
    options.url = modifyRelease + release.id;

    if (isPreRelease && releaseVersion === version && releaseBuildNumber === buildNumber) {
      options.form = "{\"prerelease\":true}";
      console.log("Editing the current GitHub release to mark it a pre-release");
      request.patch(options, (err, response, body) => {
        console.log(body);
        if (errorFunc(err, response, body, 200, "Error editing the GitHub release"))
          return;

        console.log("Successfully edited release #" + release.id);
      });
      delete options.form;
      return;

    } else if (releaseVersion !== version || releaseBuildNumber >= buildNumber) {
      return;
    }

    deprecatedReleases++;
    console.log("Deleting release #" + release.id + " - \"" + release.tag_name + "\"");

    request.delete(options, (err, response, body) => {
      if (errorFunc(err, response, body, 204, "Error deleting the GitHub release"))
        return;

      console.log("Successfully deleted release #" + release.id);

    });
  });

  console.log(deprecatedReleases + " deprecated releases detected");

});
