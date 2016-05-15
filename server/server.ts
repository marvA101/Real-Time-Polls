/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/realtimequiz.d.ts" />
"use strict"

namespace Server {

  export class Server {

    public static init() : void {
      let fs = require("fs");
      let cryptoNode = require("crypto");

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

      let app = require("http").createServer(Server.httpHandler);
      let ioServer = require("socket.io")(app);

      app.listen(config.port);
      console.log("Server listening on port", config.port);

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
        console.error("ERROR in admin namespace", e);
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
        console.error("ERROR in voting client namespace", e);
      }

    }

    private static httpHandler(req, res) : void {
      res.writeHeader(404);
      res.end();
    }

    private static configError(message : string) : void {
      console.error(message + "\nMake sure to run ManageAdmins before running the server for the first time");
      process.exit(1);
    }

  }

}

Server.Server.init();
