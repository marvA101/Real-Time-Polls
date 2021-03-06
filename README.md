# Realtime Polls

[![Travis Build Status](https://img.shields.io/travis/g0ne/Realtime-Polls.svg?style=flat-square)](https://travis-ci.org/g0ne/Realtime-Polls)
[![GitHub release](https://img.shields.io/github/release/g0ne/Realtime-Polls.svg?style=flat-square)](https://github.com/g0ne/Realtime-Polls/releases)

Built with Bootstrap, Typescript and socket.IO, the frontend runs on the majority of modern browsers including mobile.  
The backend runs on Node.js.

## Features

- Built with web technologies, works in almost all modern browsers
- Voting client and admin panel both work on mobile too
- Fast responses: socket.IO uses WebSockets or long polling for communication with the server which makes the delay almost imperceptible
- Supports different languages
- Supports LaTeX inside poll title, description and answer options (use like this: `\[ i \sqrt{64} \sum \pi \]` - `\[` starts and `\]` ends a LaTeX formula)

## Setup

#### Server

The server part needs [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/npm/open-source) (comes with Node.js) to be already installed. For an installation tutorial, check out the [npm documentation](https://docs.npmjs.com/getting-started/installing-node) on that topic.

Unpack the `realtimepolls-server.zip` and navigate into the `server` folder. Then run `npm install` to install all dependencies. Next, run either `./ManageAdmins` or `ManageAdmins.bat`, depending on your operating system and create an admin user. This will automatically encrypt your password and store it inside `config.json`.  
The `ManageAdmin` script currently does not support deleting admin account. To remove an account, edit the `config.json` file and delete the desired key and value inside the `admins` object.

The default port for the server is `5060`, to change that, edit the `port` value inside `config.json`.

Start the server with `node .` or `node server.js`.

#### Client (Admin and Voting Client)

The `realtimepolls-release.zip` file contains both clients. After unpacking it, only the values inside `admin/config.json` and `client/config.json` need to be edited. Both files are almost identical with the exception that `admin/config.json` has an additional value for an URL where the voting client is located.


This is an overview for the `admin/config.json` file, for the voting client config file, the `server` URL has to end with `/client`, not `/admin`.

| Key            | Example Value                   | Comment                                                                                                                                                    |
|----------------|---------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `server`       | `http://example.org:5060/admin` | URL of where to find the server, format: `http://DOMAIN:PORT/admin`. If you run everything on your machine for testing, `DOMAIN` can be set to `localhost` |
| `clientUrl`    | `http://example.org/quiz.html`  | URL of where the voting client is located, can also be defined relative to the .html file. This value is not needed for the site to work.                  |
| `language`     | `en`                            | Display language for the website (languages are defined inside the language.json file).                                                                    |
| `languageFile` | `language.json`                 | Path to the language.json file, relative to the .html file.                                                                                                |

## Releases

Check the [releases](../../releases/) tab for .zip files of both server and client (admin and voting client) that work with minimal setup (explained above).

Releases follow a naming scheme:  
[MAJOR] **.** [MINOR] **.** [DEV]

MAJOR: Changes in the major part of the version denote versions which differ significantly from the previous.  
MINOR: Even numbers mean, that the version is ready to be released. Odd numbers mark a pre-release.  
DEV: Odd numbers signal that the current version should not appear in the GitHub releases

## Screenshots

Admin Panel  
<a href="http://i.imgur.com/b8f6ppN.png" target="_blank">
  <img src="http://i.imgur.com/b8f6ppN.png" width="400px" alt="Admin panel">
</a>

Voting Client selecting an answer option  
<a href="http://i.imgur.com/j08bbKK.png" target="_blank">
  <img src="http://i.imgur.com/j08bbKK.png" width="400px" alt="Voting client question">
</a>

Voting client looking at the results  
<a href="http://i.imgur.com/Fn9P2bj.png" target="_blank">
  <img src="http://i.imgur.com/Fn9P2bj.png" width="400px" alt="Voting client results">
</a>
