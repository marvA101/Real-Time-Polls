/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/realtimequiz.d.ts" />
"use strict"

namespace Server {

  enum LogLevel {
    DEBUG, INFO, WARNING, CRITICAL
  }

  export class Log {

    public static level : LogLevel = LogLevel.INFO;

    private static log(level : LogLevel, ...strings : string[]) : void {
      let output = level < LogLevel.WARNING ? console.log : console.error;
      output.apply(output, strings);
    }

    // debug
    public static d(message : string) : void {
      Log.log(LogLevel.DEBUG, "[DEBUG]", message);
    }

    // info
    public static i(message : string) : void {
      Log.log(LogLevel.INFO, "[INFO]", message);
    }

    // warning
    public static w(message : string) : void {
      Log.log(LogLevel.WARNING, "[WARNING]", message);
    }

    // critical
    public static c(message : string) : void {
      Log.log(LogLevel.CRITICAL, "[CRITICAL]", message);
    }

  }

  export class Server {

    public static init() : void {
      const fs = require("fs");
      const cryptoNode = require("crypto");
      const readline = require("readline");

      // checking command line arguments
      process.argv.forEach(s => {
        if (s.toLowerCase() === "--debug") {
          Log.level = LogLevel.DEBUG;
          Log.i("Setting log level to debug");
        }
      });

      // loading config file
      let config;
      try {
        config = JSON.parse(fs.readFileSync("config.json", {
          encoding: "utf8"
        }));
      } catch (e) {
        Server.configError("Could not read or parse the config file");
      }

      if (!config.port || !config.admins || !config.hashSecret) {
        Server.configError("Invalid config file");
      }

      // loading saved polls
      const savedPollsFile = "saved_polls.json";
      const savedPollsEncoding = {
        encoding: "utf8"
      };
      Log.i("Loading saved polls, if any...");
      try {
        let polls : IPoll[] = JSON.parse(fs.readFileSync(savedPollsFile, savedPollsEncoding));
        polls.forEach(p => Poll.polls[p.id] = new Poll(p));
        Log.i("Loaded " + polls.length + " polls");

      } catch (e) {
        Log.i("Could not read or parse the " + savedPollsFile + " file");
        Log.d("Exception thrown: " + e);
      }

      let inputReadline = readline.createInterface(process.stdin, process.stdout);
      inputReadline.on("SIGINT", () => {
        Log.i("Received interrupt, exiting");

        Log.i("Saving polls...");
        let polls : IPoll[] = [];
        for (let id in Poll.polls) {
          polls.push(Poll.polls[id].toAdminJSON());
        }
        fs.writeFileSync(savedPollsFile, JSON.stringify(polls), savedPollsEncoding);
        Log.i("Polls saved to file " + savedPollsFile);

        process.exit(0);
      });

      let app = require("http").createServer(Server.httpHandler);
      let ioServer = require("socket.io")(app);

      app.listen(config.port);
      Log.i("Server listening on port " + config.port);

      let adminNs = ioServer.of("/admin");
      let clientNs = ioServer.of("/client");

      try {

        adminNs.on("connection", function(socket) {

          let client : AdminClient = new AdminClient(socket);

          socket.on("login", function(credentials : AdminAuthenticationMessage) {
            client.onLogin(cryptoNode, config, credentials);
          });

          socket.on("addpoll", function(poll : IPoll) {
            if (!client.isLoggedIn() || Poll.polls[poll.id] != null) {
              return;
            }

            let pollInstance = new Poll(poll);
            Poll.polls[poll.id] = pollInstance;
          });

          socket.on("removepoll", function(id : number) {
            if (!client.isLoggedIn()) {
              return;
            }

            let poll = Poll.polls[id];
            if (poll != null) {
              poll.remove();
            }
          });

          socket.on("addquestion", function(pollId : number, question : IQuestionAdmin) {
            if (!client.isLoggedIn()) {
              return;
            }

            let poll = Poll.polls[pollId];
            if (poll != null && !poll.isPublished()) {
              let questionInstance = new Question(question);
              poll.addQuestion(questionInstance);
            }
          });

          socket.on("removequestion", function(pollId : number, index : number) {
            if (!client.isLoggedIn()) {
              return;
            }

            let poll = Poll.polls[pollId];
            if (poll != null && !poll.isPublished()) {
              poll.removeQuestion(index);
            }
          });

          socket.on("setpublished", function(pollId : number, published : boolean) {
            if (!client.isLoggedIn()) {
              return;
            }

            let poll = Poll.polls[pollId];
            if (poll != null) {
              poll.setPublished(published);
            }
          });

          socket.on("setstate", function(pollId : number, pollState : AdminSetPollStateMessage) {
            if (!client.isLoggedIn()) {
              return;
            }

            let poll = Poll.polls[pollId];
            if (poll != null) {
              poll.setActiveState(pollState.activeQuestion, pollState.activeState);
            }
          });

          socket.on("updatequestion", function(pollId : number, questionIndex : number, question : IQuestionAdmin) {
            if (!client.isLoggedIn()) {
              return;
            }

            let poll = Poll.polls[pollId];
            if (poll != null) {
              poll.updateQuestion(questionIndex, question);
            }
          });

          socket.on("logout", function() {
            client.onLogout();
          });

          socket.on("disconnect", function() {
            client.onLogout();
          });

        });


      } catch (e) {
        Log.w("Error in admin namespace " + e);
      }

      try {

        clientNs.on("connection", function(socket) {

          let client = new VotingClient(socket);

          socket.on("init", function(init : ClientInitMessage) {
            client.onInit(init);
          });

          socket.on("vote", function(message : ClientVotingMessage) {
            client.onVote(message.optionIndex);
          })

          socket.on("disconnect", function() {
            client.onDisconnect();
          });

        });

      } catch (e) {
        Log.w("Error in voting client namespace " + e);
      }

    }

    private static httpHandler(req, res) : void {
      res.writeHeader(404);
      res.end();
    }

    private static configError(message : string) : void {
      Log.c(message + "\nMake sure to run ManageAdmins before running the server for the first time");
      process.exit(1);
    }

  }

}

Server.Server.init();
