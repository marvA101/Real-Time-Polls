/// <reference path="../server.ts" />

namespace Server {

  export class Poll {

    public static polls : { [index : number] : Poll } = {};
    public static pollCount : number = 0

    private id : number;
    private published : boolean;
    private questions : Question[];
    private activeQuestion : number;
    private activeState : PollState;

    constructor(json : IPoll) {
      this.id = json.id;
      this.published = json.published;
      this.questions = json.questions.map(function(question) {
        return new Question(question);
      });
      this.activeQuestion = json.activeQuestion;
      this.activeState = json.activeState;
    }

    public getId() : number {
      return this.id;
    }

    public isPublished() : boolean {
      return this.published;
    }

    public setPublished(published : boolean) : void {
      if (this.published == published || (published && this.questions.length == 0)) {
        return;
      }

      // poll has been unpublished
      if (this.published && !published) {
        VotingClient.forEach(function(client : VotingClient) {
          client.reset();
        }, this.id);

        this.questions.forEach(function(question) {
          question.reset();
        });
      }

      this.published = published;
    }

    public remove() : void {
      VotingClient.forEach(function(client : VotingClient) {
        client.errorMessage("pollClosed");
      }, this.id);
      delete Poll.polls[this.id];
    }

    public addQuestion(question : Question) : void {
      this.questions.push(question);
    }

    public removeQuestion(index : number) : void {
      if (index < 0 || index >= this.questions.length) {
        return;
      }

      this.questions.splice(index, 1);
    }

    public updateQuestion(index : number, question : IQuestionAdmin) : void {
      if (index < 0 || index >= this.questions.length) {
        return;
      }

      this.questions[index] = new Question(question);
    }

    public setActiveState(activeQuestion : number, activeState : PollState) {
      if (activeQuestion == this.activeQuestion && activeState == this.activeState) {
        return;
      }

      this.activeQuestion = activeQuestion;
      this.activeState = activeState;
      if (activeQuestion == -1) {
        return;
      }

      if (activeState == PollState.VOTING) {
          this.questions[activeQuestion].reset();
      }

      VotingClient.forEach(function(client : VotingClient) {
        client.updateState();
      }, this.id);
    }

    public getActiveState() : PollState {
      return this.activeState;
    }

    public getActiveQuestion() : Question {
      return this.getQuestion(this.activeQuestion);
    }

    public getQuestion(index : number) : Question {
      if (index < 0 || index >= this.questions.length) {
        return null;
      }
      return this.questions[index];
    }

    public toAdminJSON() : IPoll {
      return {
        id: this.id,
        published: this.published,
        activeQuestion: this.activeQuestion,
        activeState: this.activeState,
        questions: this.questions.map(q => q.toResultsJSON())
      };
    }

  }

}
