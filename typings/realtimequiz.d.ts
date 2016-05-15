
// NETWORK MESSAGE INTERFACES
interface AdminAuthenticationMessage {
  username : string;
  password : string;
}

interface AdminStatusMessage {
  loggedIn : boolean;
  clientsConnected? : number;
  activePolls? : number;
}

interface AdminSetPollStateMessage {
  activeQuestion : number;
  activeState : PollState;
}

interface ClientInitMessage {
  id : string;
  pollId : number;
}

interface ClientVotingMessage {
  optionIndex : number;
}

// CONTENT INTERFACES
interface IOption {
  text : string;
}

interface IOptionResults extends IOption {
  votes : number;
}

interface IQuestion {
  title : string;
  description : string;
  options : IOption[];
}

interface IQuestionAdmin extends IQuestion {
  correctOption : number;
}

interface IQuestionResults extends IQuestionAdmin {
  options: IOptionResults[];
}

interface IPoll {
  id : number;
  published : boolean;
  questions : IQuestionAdmin[];
  activeQuestion : number;
  activeState : PollState;
}

interface PollExtended extends IPoll {
  votes : number;
}

declare const enum PollState {
  VOTING = 0, EVALUATING = 1
}

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

// SERVER INTERFACES
