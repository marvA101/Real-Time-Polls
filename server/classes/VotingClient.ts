/// <reference path="../server.ts" />

namespace Server {

  export class VotingClient extends Client {

    public static clientsConnected : number = 0;
    public static clients : { [index : string] : VotingClient } = {};

    public static forEach : (c : (VotingClient, string?) => void, pollId? : number) => void = function(callback, pollId) {
      let filterByPollId = pollId != null;
      for (let clientId in VotingClient.clients) {
        let client = VotingClient.clients[clientId];
        if (!client.isInitialised() || (filterByPollId && client.getPollId() != pollId)) {
          continue;
        }

        callback(client, clientId);
      }
    };

    private initialised : boolean;
    private id : string;
    private pollId : number;

    constructor(socket : any) {
      super(socket);
      this.initialised = false;
      VotingClient.clientsConnected++;

      if (AdminClient.activeAdmin != null) {
        AdminClient.activeAdmin.statusMessage();
      }
      console.log("Voting client connected");
    }

    public getId() : string {
        return this.id;
    }

    public errorMessage(message : string, context : {[index : string] : string} = {}) : void {
      super.errorMessage(message, context);

      this.setInitialised(false);
    }

    public isInitialised() : boolean {
      return this.initialised;
    }

    public getPollId() : number {
      return this.pollId;
    }

    public getPoll() : Poll {
      if (!this.isInitialised()) {
        return null;
      }

      return Poll.polls[this.pollId];
    }

    public onInit(init : ClientInitMessage) : void {
      if (typeof init.id != "string" || init.id.length != 32) {
        this.errorMessage("invalidID");
        return;
      }
      this.id = init.id;

      let foundDuplicate = false;
      VotingClient.forEach(function(client : VotingClient) {
        if (client.id == init.id) {
          foundDuplicate = true;
        }
      });
      if (foundDuplicate) {
        this.errorMessage("alreadyConnected");
        return;
      }

      if (Poll.polls[init.pollId] == null || !Poll.polls[init.pollId].isPublished()) {
        this.errorMessage("pollDoesntExist", { id: init.pollId + "" });
        return;
      }

      this.pollId = init.pollId;
      this.setInitialised(true);

      this.updateState();
    }

    private setInitialised(initialised : boolean) : void {
      if (this.initialised == initialised) {
        return;
      }

      this.initialised = initialised;
      if (initialised) {
        VotingClient.clients[this.id] = this;
      } else {
        delete VotingClient.clients[this.id];
      }
    }

    public onVote(optionIndex : number) : void {
      if (!this.initialised) {
        this.errorMessage("notEnteredIntoPoll");
        return;
      }

      let poll : Poll = this.getPoll();
      if (poll.getActiveState() != PollState.VOTING) {
        this.errorMessage("cantVote");
        return;
      }

      let activeQuestion : Question = poll.getActiveQuestion();
      if (activeQuestion == null) {
        this.errorMessage("cantVote");
        return;
      }

      let result : boolean = activeQuestion.countClientVote(this.id, optionIndex);
      if (!result) {
        this.errorMessage("couldntCountVote");
        return;
      }

      if (AdminClient.activeAdmin != null) {
        AdminClient.activeAdmin.updateVotesPoll(poll.getId());
      }
    }

    public onDisconnect() : void {
      VotingClient.clientsConnected--;
      this.setInitialised(false);

      if (AdminClient.activeAdmin != null) {
        AdminClient.activeAdmin.statusMessage();
      }
      console.log("Voting client disconnected");
    }

    public reset() : void {
      this.setInitialised(false);
      this.socket.emit("reset");
    }

    public updateState() : void {
      let poll = this.getPoll();
      switch (poll.getActiveState()) {
        case PollState.VOTING:
          let messageType = poll.getActiveQuestion().hasVoted(this.id) ? "voted" : "vote";
          this.socket.emit(messageType, poll.getActiveQuestion().toVoteJSON());
          break;

        case PollState.EVALUATING:
          this.socket.emit("results", poll.getActiveQuestion().toResultsJSON());
          break;
      }
    };

  }

}
