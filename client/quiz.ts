/// <reference path="../typings/realtimequiz.d.ts" />
/// <reference path="../typings/socket.io-client.d.ts" />
/// <reference path="../typings/angular.d.ts" />
/// <reference path="../typings/jquery.d.ts" />
/// <reference path="../typings/mathjax.d.ts" />
/// <reference path="../i18n/i18n.ts" />
"use strict"

class Utils {

  private static charMap : string = "0123456789abcdef";

  public static generateHexString(length : number) : string {
    let s : string[] = new Array(length);
    for (let i = 0; i < length; i++) {
      s[i] = Utils.charMap[Math.floor(Math.random() * Utils.charMap.length)];
    }
    return s.join("");
  }

  public static isHexString(s : string) : boolean {
    for (let i = 0; i < s.length; i++) {
      if (Utils.charMap.indexOf(s[i]) == -1) {
        return false;
      }
    }
    return true;
  }

  public static getIdFromCookie() : string {
    let splitted = document.cookie.split(";");
    for (let i = 0; i < splitted.length; i++) {
      let s = splitted[i];
      if (s.length == 35 && s.substr(0, 3) == "cid") {
        let id = s.substr(3);
        if (Utils.isHexString(id)) {
          return id;
        }
      }
    }

    return null;
  }

  public static getApplyFunction(f, thisRef) : any {
    return function() {
      return f.apply(thisRef, arguments);
    };
  }

}

class QuizApp {

  public static clientId : string;
  public static $scope : any;
  public static socket : SocketIOClient.Socket;
  public static translator : I18n;

  private static onAngularAppReadyQueue : any[];

  public static init() : void {
    let cookieId = Utils.getIdFromCookie();
    if (cookieId == null) {
      cookieId = Utils.generateHexString(32);
      document.cookie = "cid" + cookieId;
    }
    QuizApp.clientId = cookieId;

    QuizApp.translator = new I18n("en");
    QuizApp.onAngularAppReadyQueue = [];

    var quizApp = angular.module("quizApp", []);

    quizApp.directive("rqMathjax", function() {
      return {
        restrict: "A",
        controller: ["$scope", "$element", "$attrs", function($scope, $element, $attrs) {
          $scope.$watch($attrs.rqMathjax, function(expression) {
            $element.html(expression);
            MathJax.Hub.Queue([ "Typeset", MathJax.Hub, $element[0] ]);
          });
        }]
      };
    });

    quizApp.controller("mainController", ["$scope", function($scope) {
      QuizApp.$scope = $scope;
      $scope.state = "loading";

      $scope.t = () => "";
      $scope.tp = () => "";

      $scope.loginPollId = "";
      $scope.onLogin = function() {
        if (typeof $scope.loginPollId != "number" || $scope.loginPollId == undefined ||
            $scope.loginPollId < 100000 || $scope.loginPollId > 999999) {
          QuizApp.showError(QuizApp.translator.translate("pinError"), true);
          return;
        }

        let initMessage : ClientInitMessage = {
          id: QuizApp.clientId,
          pollId: $scope.loginPollId
        };
        QuizApp.socket.emit("init", initMessage);
      };

      $scope.question = null;
      $scope.selectedOption = 0;
      $scope.setSelected = function(selected) {
        $scope.selectedOption = selected;
      };
      $scope.onVote = function() {
        let votingMessage : ClientVotingMessage = {
          optionIndex: $scope.selectedOption
        };
        QuizApp.socket.emit("vote", votingMessage);
        QuizApp.setState("voted", true);
      };

      QuizApp.onAngularAppReady();
    }]);

    $.getJSON("config.json", function(config) {
      let s = io.connect(config.server);
      QuizApp.socket = s;

      QuizApp.translator.setLanguage(config.language);
      QuizApp.translator.load(config.languageFile, () => {
        QuizApp.onAngularAppReady(() => {
          QuizApp.$scope.t = Utils.getApplyFunction(QuizApp.translator.translate, QuizApp.translator);
          QuizApp.$scope.tp = Utils.getApplyFunction(QuizApp.translator.translatePlural, QuizApp.translator);
        });
      });

      s.on("connect", function() {
        if (QuizApp.getState() == "loading") {
          QuizApp.setState("login");
        }
      });

      s.on("apperror", function(message : string) {
        QuizApp.showError(message);
      });

      s.on("error", function(e) {
        QuizApp.showError(QuizApp.translator.translate("error"));
        console.log(new Date().getTime(), e);
      });

      s.on("reset", function() {
        QuizApp.setState("login");
      });

      s.on("vote", function(question : IQuestion) {
        QuizApp.$scope.$apply(function() {
          QuizApp.$scope.question = question;
          QuizApp.setState("voting", true);
        });
      });

      s.on("voted", function(question : IQuestion) {
        QuizApp.$scope.$apply(function() {
          QuizApp.$scope.question = question;
          QuizApp.setState("voted", true);
        });
      });

      s.on("results", function(question : IQuestionResults) {
        let questionExtended : any = question;
        questionExtended.voteCount = question.options.reduce((acc, o) => acc + o.votes, 0);
        questionExtended.options.forEach(o => {
          if (questionExtended.voteCount == 0) {
            o.percent = 0;

          } else {
            o.percent = (o.votes / questionExtended.voteCount) * 100;
          }
        });

        QuizApp.$scope.$apply(function() {
          QuizApp.$scope.question = questionExtended;
        });
        QuizApp.setState("results");
      });

      let hashResult = /^#([0-9]{6})/.exec(window.location.hash);
      if (hashResult != null && hashResult.length > 1) {
        try {
          let hashId = +hashResult[1];
          let initMessage : ClientInitMessage = {
            id: QuizApp.clientId,
            pollId: hashId
          };
          QuizApp.socket.emit("init", initMessage);
          return;

        } catch (e) {}
      }

    });
  }

  public static onAngularAppReady(f? : () => void) {
    if (f == null) {
      if (QuizApp.$scope != null) {
        QuizApp.onAngularAppReadyQueue.forEach(fun => fun());
        QuizApp.onAngularAppReadyQueue = [];
      }
      return;
    }

    if (QuizApp.$scope != null) {
      f();
    } else {
      QuizApp.onAngularAppReadyQueue.push(f);
    }
  }

  public static getState() : string {
    return QuizApp.$scope.state;
  }

  public static setState(state : string, dontApply? : boolean) : void {
    let update = function() {
      if (state == "voting") {
        QuizApp.$scope.selectedOption = 0;
      }

      if (state != "login") {
        QuizApp.$scope.error = false;
      }
      QuizApp.$scope.state = state;
    };

    if (dontApply) {
      update();
    } else {
      QuizApp.$scope.$apply(update);
    }
  }

  public static showError(errorMessage : string, dontApply? : boolean) : void {
    let update = function() {
      QuizApp.$scope.errorMessage = errorMessage;
      QuizApp.$scope.error = true;
    };

    if (dontApply) {
      update();
    } else {
      QuizApp.$scope.$apply(update);
    }
    QuizApp.setState("login", dontApply);
  }

}

QuizApp.init();
