/// <reference path="../server.ts" />

namespace Server {

  export class AdminClient extends Client {

    public static adminsConnected : number = 0;
    public static activeAdmin : AdminClient = null;

    private loggedIn : boolean;

    constructor(socket : any) {
      super(socket);
      this.loggedIn = false;

      console.log("Admin connected but not yet authenticated");
    }

    public statusMessage() : void {
      let statusMessage : AdminStatusMessage = {
        loggedIn: this.loggedIn
      };
      if (this.loggedIn) {
        statusMessage.clientsConnected = VotingClient.clientsConnected;

        let activePolls = [];
        VotingClient.forEach(function(client : VotingClient) {
          let id = client.getPollId();
          if (activePolls.indexOf(id) == -1) {
            activePolls.push(id);
          }
        });
        statusMessage.activePolls = activePolls.length;
      }

      this.socket.emit("status", statusMessage);
    }

    public updateVotesPoll(pollId : number) : void {
      let activeQuestion = Poll.polls[pollId].getActiveQuestion();
      if (activeQuestion != null) {
        let votes : number = activeQuestion.getVotes()
        this.socket.emit("votesupdate", pollId, votes);
      }
    }

    public sendPolls() : void {
      let pollList : IPoll[] = [];
      for (let name in Poll.polls) {
        pollList.push(Poll.polls[name].toAdminJSON());
      }
      console.log("Sending poll list to admin");
      this.socket.emit("pollupdate", pollList);

      for (let id in Poll.polls) {
        this.updateVotesPoll(+id);
      }
    }

    public onLogin(cryptoNode, config, credentials : AdminAuthenticationMessage) : void {
      console.log("Admin tries to log in");

      let passwordHash = config.admins[credentials.username];
      let hmac = cryptoNode.createHmac("sha256", config.hashSecret);
      if (passwordHash != null) {
        hmac.update(credentials.password);
        let receivedHash = hmac.digest("hex");
        if (passwordHash == receivedHash) {
          if (AdminClient.adminsConnected > 0) {
            this.errorMessage("Another admin is already connected");
            return;
          }

          this.loggedIn = true;
          AdminClient.activeAdmin = this;
          AdminClient.adminsConnected++;
          this.statusMessage();
          this.sendPolls();
          console.log("Admin successfully logged in");
          return;
        }
      }

      this.errorMessage("Wrong username or password");
    }

    public onLogout() : void {
      if (this.loggedIn) {
        AdminClient.adminsConnected--;
        AdminClient.activeAdmin = null;
      }
      this.loggedIn = false;
      console.log("Admin logged out");
    }

    public isLoggedIn() : boolean {
      return this.loggedIn;
    }

  }

}
