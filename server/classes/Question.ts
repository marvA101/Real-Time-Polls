/// <reference path="../server.ts" />

namespace Server {

  export class Question {

    private title : string;
    private description : string;
    private options : VoteOption[];
    private correctOption : number;
    private clientVotes : string[];

    constructor(json : IQuestionAdmin) {
      this.title = json.title;
      this.description = json.description;
      this.options = json.options.map(function(option) {
        return new VoteOption(option);
      });
      this.correctOption = json.correctOption;
      this.clientVotes = [];
    }

    public getOption(index : number) : VoteOption {
      if (index < 0 || index >= this.options.length) {
        return null;
      }
      return this.options[index];
    }

    public hasVoted(clientId : string) : boolean {
      return this.clientVotes.indexOf(clientId) != -1;
    }

    public countClientVote(clientId : string, votedOption : number) : boolean {
      if (this.hasVoted(clientId) || votedOption < 0 || votedOption >= this.options.length) {
        return false;
      }

      this.clientVotes.push(clientId);
      this.options[votedOption].countClientVote(clientId);
      return true;
    }

    public getVotes() : number {
      return this.clientVotes.length;
    }

    public reset() : void {
      this.clientVotes = [];
      this.options.forEach(function(option) {
        option.reset();
      });
    }

    public toVoteJSON() : IQuestion {
      return {
        title: this.title,
        description: this.description,
        options: this.options.map(option => option.toVoteJSON())
      };
    }

    public toResultsJSON() : IQuestionResults {
      return {
        title: this.title,
        description: this.description,
        options: this.options.map(option => option.toResultsJSON()),
        correctOption: this.correctOption
      }
    }

  }

}
