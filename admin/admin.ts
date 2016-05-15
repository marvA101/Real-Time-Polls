/// <reference path="../typings/realtimequiz.d.ts" />
/// <reference path="../typings/socket.io-client.d.ts" />
/// <reference path="../typings/angular.d.ts" />
/// <reference path="../typings/jquery.d.ts" />
/// <reference path="../typings/mathjax.d.ts" />
/// <reference path="../i18n/i18n.ts" />
"use strict"

interface QuizScopeVariables extends ng.IScope {
  connected : boolean;
  loggedIn : boolean;
  loginUsername : string;
  loginPassword : string;

  error : boolean;
  errorMessage : string;

  publicClientUrl : string;
  stats : {
    connectedClients : number;
    activePolls : number;
  };

  polls: PollExtended[];
  activePoll : IPoll;
  activeQuestion : IQuestionAdmin;

  // translator functions
  t : (key : string, context? : I18nContext) => string;
  tp : (key : string, n : number, context? : I18nContext) => string;
}

class Quiz {

  private static socket : SocketIOClient.Socket;

  private static quizAdminApp : ng.IModule;
  private static scope : QuizScopeVariables;
  private static quizScope : QuizScope;

  public static translator : I18n;

  private static onAngularAppReadyQueue : any[];

  private static promptModal;
  public static questionModal;

  public static init() {
    Quiz.onAngularAppReadyQueue = [];

    $(function() {
      Quiz.questionModal = $("#modalQuestion");
      Quiz.promptModal = $("#modalPrompt");
    });

    Quiz.quizAdminApp = angular.module("quizAdminApp", []);
    Quiz.quizAdminApp.controller("mainController", ["$scope", function($scope) {
      Quiz.scope = $scope;
      Quiz.quizScope = new QuizScope($scope, Quiz.socket);
      Quiz.onAngularAppReady();
    }]);

    $.getJSON("config.json", function(config) {
      Quiz.socket = io.connect(config.server);

      Quiz.translator = new I18n(config.language);
      Quiz.translator.load(config.languageFile, () => {
        Quiz.onAngularAppReady(() => {
          Quiz.scope.t = Util.getApplyFunction(Quiz.translator.translate, Quiz.translator);
          Quiz.scope.tp = Util.getApplyFunction(Quiz.translator.translatePlural, Quiz.translator);
          Quiz.scope.$digest();
        });
      });

      Quiz.onAngularAppReady(() => {
        Quiz.scope.publicClientUrl = config.clientUrl;
      });

      Quiz.socket.on("connect", function() {
        Quiz.scopeApply(function() {
          Quiz.scope.connected = true;
        });
      });

      Quiz.socket.on("apperror", function(errorMessage) {
        Quiz.scopeApply(function() {

          Quiz.scope.error = true;
          Quiz.scope.errorMessage = errorMessage;
          Quiz.scope.loggedIn = false;

        });
      });

      Quiz.socket.on("status", function(status : AdminStatusMessage) {
        Quiz.scopeApply(function() {

          Quiz.scope.loggedIn = status.loggedIn;
          Quiz.scope.loginUsername = "";
          Quiz.scope.loginPassword = "";
          if (status.loggedIn) {
            Quiz.scope.error = false;
            Quiz.scope.stats.connectedClients = status.clientsConnected;
            Quiz.scope.stats.activePolls = status.activePolls;
          }

        });
      });

      Quiz.socket.on("votesupdate", function(pollId : number, votes : number) {
        Quiz.scopeApply(function() {
          for (let i = 0; i < Quiz.scope.polls.length; i++) {
            let poll = Quiz.scope.polls[i];
            if (poll.id == pollId) {
              poll.votes = votes;
              return;
            }
          }
        });
      });

      Quiz.socket.on("pollupdate", function(polls : IPoll[]) {
        Quiz.scopeApply(function() {

          polls.forEach(function(receivedPoll) {
            Quiz.quizScope.addPoll(true);
            let poll = Quiz.scope.polls[Quiz.scope.polls.length - 1];
            poll.id = receivedPoll.id;
            poll.published = receivedPoll.published;
            poll.activeQuestion = receivedPoll.activeQuestion;
            poll.activeState = receivedPoll.activeState;

            receivedPoll.questions.forEach(function(receivedQuestion) {
              (<any> poll).addQuestion(true);
              let question : IQuestionAdmin = poll.questions[poll.questions.length - 1];
              question.correctOption = receivedQuestion.correctOption;
              question.title = receivedQuestion.title;
              question.description = receivedQuestion.description;
              question.options = receivedQuestion.options;
            });
          });

        });
      });
    });
  }

  public static scopeApply(f : () => void) {
    if (Quiz.scope == null) {
      return;
    }

    Quiz.scope.$apply(f);
  }

  public static onAngularAppReady(f? : () => void) {
    if (f == null) {
      if (Quiz.scope != null) {
        Quiz.onAngularAppReadyQueue.forEach(fun => fun());
        Quiz.onAngularAppReadyQueue = [];
      }
      return;
    }

    if (Quiz.scope != null) {
      f();
    } else {
      Quiz.onAngularAppReadyQueue.push(f);
    }
  }

  public static showPrompt(title : string, text : string, callback : (agreed? : boolean) => void) {
    var agreed = false;
    Quiz.promptModal.find(".modal-header .modal-title span:last").text(title);
    Quiz.promptModal.find(".modal-body").text(text);
    Quiz.promptModal.find(".modal-footer button.btn-danger").one("click", function() {
      agreed = true;
      Quiz.promptModal.modal("hide");
    });

    Quiz.promptModal.one("hide.bs.modal", function() {
      if (callback.length == 0) {
        if (agreed)
          callback();
        return;
      }

      callback(agreed);
    });

    Quiz.promptModal.modal("show");
  }

}

class QuizScope {

  private scope : QuizScopeVariables | any;
  private socket : SocketIOClient.Socket;

  constructor(scope : ng.IScope, socket : SocketIOClient.Socket) {
    this.scope = scope;
    this.socket = socket;

    this.injectFunctions();
  }

  private injectFunctions() {
    this.scope.connected = false;

    this.scope.loggedIn = false;
    this.scope.onLogin = Util.getApplyFunction(this.onLogin, this);
    this.scope.onLogout = Util.getApplyFunction(this.onLogout, this);

    this.scope.error = false;
    this.scope.errorMessage = "";

    this.scope.stats = {
      connectedClients: 0,
      activePolls: 0
    };

    // utility functions
    this.scope.qrCodeUrl = Util.getApplyFunction(this.qrCodeUrl, this);
    this.scope.stopProp = Util.getApplyFunction(this.stopProp, this);

    // translation functions
    this.scope.t = null;
    this.scope.tp = null;

    this.scope.polls = [];
    this.scope.activePoll = null;
    this.scope.activeQuestion = null;

    this.scope.addPoll = Util.getApplyFunction(this.addPoll, this);
    this.scope.removePoll = Util.getApplyFunction(this.removePoll, this);
  }

  private onLogin() {
    let credentials : AdminAuthenticationMessage = {
      username: this.scope.loginUsername,
      password: this.scope.loginPassword
    };
    this.socket.emit("login", credentials);
  }

  private onLogout() {
    this.scope.loggedIn = false;
    this.scope.polls = [];
    this.socket.emit("logout");
  }

  public qrCodeUrl(poll) : string {
    return encodeURIComponent(this.scope.publicClientUrl + "#" + poll.id);
  }

  public stopProp(e : Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  public addPoll(omitUpdate? : boolean) {
    let id = 100000 + Math.floor(Math.random() * 900000);
    let poll : PollExtended = {
      id: id,
      published: false,
      questions: [],
      activeQuestion: -1,
      activeState: PollState.VOTING,
      votes: 0
    };

    let adminPoll = new AdminPoll(this.scope, poll, this.socket);

    if (!omitUpdate) {
      this.socket.emit("addpoll", poll);
    }
    this.scope.polls.push(poll);
  }

  public removePoll(id : number) {
    let self = this;
    Quiz.showPrompt(Quiz.translator.translate("removePoll"), Quiz.translator.translate("removePollText"), function() {
      self.scope.$apply(function() {
        self.socket.emit("removepoll", id);

        for (let i = 0; i < self.scope.polls.length; i++) {
          if (self.scope.polls[i].id == id) {
            self.scope.polls.splice(i, 1);
          }
        }
      });
    });
  }

}

class AdminPoll {

  private scope : QuizScopeVariables | any;
  private poll : PollExtended | any;
  private socket : SocketIOClient.Socket;

  constructor(scope : QuizScopeVariables | any, poll : PollExtended, socket : SocketIOClient.Socket) {
    this.scope = scope;
    this.poll = poll;
    this.socket = socket;

    this.injectFunctions();
  }

  private injectFunctions() {
    this.poll.votes = 0;
    this.poll.questions = [];

    this.poll.setPublished = Util.getApplyFunction(this.setPublished, this);
    this.poll.setState = Util.getApplyFunction(this.setState, this);
    this.poll.getState = Util.getApplyFunction(this.getState, this);
    this.poll.addQuestion = Util.getApplyFunction(this.addQuestion, this);
    this.poll.removeQuestion = Util.getApplyFunction(this.removeQuestion, this);
  }

  public setPublished(published : boolean) {
    this.poll.published = published;
    this.socket.emit("setpublished", this.poll.id, published);
  }

  public getState() : string {
    return this.poll.activeState == PollState.VOTING ? "voting" : "evaluating";
  }

  public setState(idx : number, state : any, omitUpdate? : boolean) {
    let pollState : PollState;
    if (typeof state == "string") {
      pollState = state == "voting" ? PollState.VOTING : PollState.EVALUATING;
    } else {
      pollState = state;
    }

    let stateChanged = this.poll.activeState != pollState;
    let questionChanged = this.poll.activeQuestion != idx;
    if (!stateChanged && !questionChanged) {
      return;
    }

    if (questionChanged || pollState == PollState.VOTING) {
      this.poll.votes = 0;
    }

    this.poll.activeQuestion = idx;
    this.poll.activeState = pollState;

    if (!omitUpdate) {
      let stateMessage : AdminSetPollStateMessage = {
        activeQuestion: idx,
        activeState: pollState
      };
      this.socket.emit("setstate", this.poll.id, stateMessage);
    }
  }

  public addQuestion(omitUpdate? : boolean) {
    let question : IQuestionAdmin = {
      title: "",
      description: "",
      options: [],
      correctOption: 0
    };

    let adminQuestion = new AdminQuestion(this.scope, this.socket, question, this.poll);
    adminQuestion.addOption();

    this.poll.questions.push(question);
    adminQuestion.question.idx = this.poll.questions.length - 1;

    if (!omitUpdate) {
      this.socket.emit("addquestion", this.poll.id, question);
      adminQuestion.open();
    }

    if (this.poll.activeQuestion == -1) {
      this.setState(0, PollState.VOTING, omitUpdate);
    }
  }

  public removeQuestion(idx) {
    let self = this;

    Quiz.showPrompt(Quiz.translator.translate("removeQuestion"), Quiz.translator.translate("removeQuestionText"), function() {
      Quiz.scopeApply(() => {
        if (self.poll.questions.length == 1) {
          self.setState(-1, PollState.VOTING);
        } else if (self.poll.questions.length - 1 == idx) {
          self.setState(self.poll.activeQuestion - 1, PollState.VOTING);
        }

        self.socket.emit("removequestion", self.poll.id, idx);
        self.poll.questions.forEach((q, idx) => (<any> q).idx = idx);
        self.poll.questions.splice(idx, 1);
      });
    });
  }

}

class AdminQuestion {

  private scope : QuizScopeVariables | any;
  public question : IQuestionAdmin | any;
  private poll : PollExtended;
  private socket : SocketIOClient.Socket;

  constructor(scope: QuizScopeVariables | any, socket : SocketIOClient.Socket, question : IQuestionAdmin, poll : PollExtended) {
    this.scope = scope;
    this.socket = socket;
    this.question = question;
    this.poll = poll;

    this.injectFunctions();
  }

  private injectFunctions() {
    this.question.addOption = Util.getApplyFunction(this.addOption, this);
    this.question.removeOption = Util.getApplyFunction(this.removeOption, this);
    this.question.open = Util.getApplyFunction(this.open, this);
  }

  public addOption() {
    this.question.options.push({
      text: ""
    });
  }

  public removeOption(idx : number) {
    this.question.options.splice(idx, 1);
    if (idx == this.question.correctOption) {
      this.question.correctOption = 0;
    }
  }

  public open() {
    this.scope.activePoll = this.poll;
    this.scope.activeQuestion = this.question;

    Quiz.questionModal.one("hide.bs.modal", () => {
      this.socket.emit("updatequestion", this.poll.id, this.question.idx, this.question);
    });
    Quiz.questionModal.modal("show");
  }

}

class Util {

  public static getApplyFunction(f, thisRef) : any {
    return function() {
      return f.apply(thisRef, arguments);
    };
  }

}

Quiz.init();
