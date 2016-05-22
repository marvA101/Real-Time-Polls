"use strict"

const fs = require("fs");
const request = require("request");

const gitHubUser = process.env.GITHUB_USER;
const gitHubRepo = process.env.GITHUB_REPO;
const gitHubKey = process.env.GITHUB_API_KEY;
const version = fs.readFileSync("VERSION", {
  encoding: "utf8"
});
const buildNumber = +process.env.TRAVIS_BUILD_NUMBER;

const baseApiUrl = "https://" + gitHubUser + ":" + gitHubKey + "@api.github.com/";
const listReleases = baseApiUrl + "repos/" + gitHubUser + "/" + gitHubRepo + "/releases";
const removeRelease = baseApiUrl + "repos/" + gitHubUser + "/" + gitHubRepo + "/releases/";

console.log("Requesting list of all GitHub Releases");

request.get(listReleases, (err, response, body) => {
  if (err || response.statusCode != 200) {
    console.error("Error getting a list of all GitHub releases");
    if (response)
      console.error("Status code:", response.statusCode);
    return;
  }

  let releases;
  try {
    releases = JSON.parse(body);
  } catch (e) {
    console.error("Error parsing the JSON body:");
    console.error(body);
    return;
  }

  console.log("Got list, deleting deprecated ones");
  console.log("#Releases:", releases.length);

  releases.forEach(release => {
    const releaseVersion = release.tag_name.split("-")[0];
    const releaseBuildNumber = +release.tag_name.split("-")[1];
    if (releaseVersion !== version || releaseBuildNumber >= buildNumber)
      return;

    console.log("Deleting release #" + release.id + " - \"" + release.name + "\"");
    request.delete(removeRelease + release.id, (err, response, body) => {
      if (err || response.statusCode != 204) {
        console.error("Error deleting the GitHub release");
        if (response)
          console.error("Status code:", response.statusCode);
        return;
      }

      console.log("Successfully deleted release #" + release.id);

    });
  });

});
