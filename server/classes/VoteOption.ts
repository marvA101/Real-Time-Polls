namespace Server {

  export class VoteOption {

    private text : string;
    private votes : string[]; // clientIds that voted for this option

    constructor(json : IOption) {
      this.text = json.text;
      this.votes = [];
    }

    public reset() : void {
      this.votes = [];
    }

    public countClientVote(clientId : string) {
      this.votes.push(clientId);
    }

    public toVoteJSON() : IOption {
      return {
        text: this.text
      }
    }

    public toResultsJSON() : IOptionResults {
      return {
        text: this.text,
        votes: this.votes.length
      };
    }

  }

}
