namespace Server {

  export class AdminClient extends Client {

    public static adminsConnected : number = 0;
    public static activeAdmin : AdminClient = null;

    private loggedIn : boolean;
    private username : string;

    constructor(socket : any) {
      super(socket);
      this.loggedIn = false;

      Log.d("Admin connected but not yet authenticated");
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
      Log.d("Sending poll list to admin");
      this.socket.emit("pollupdate", pollList);

      for (let id in Poll.polls) {
        this.updateVotesPoll(+id);
      }
    }

    public onLogin(cryptoNode, config, credentials : AdminAuthenticationMessage) : void {
      Log.d("Admin " + credentials.username + " tries to log in");

      let passwordHash = config.admins[credentials.username];
      let hmac = cryptoNode.createHmac("sha256", config.hashSecret);
      if (passwordHash != null) {
        hmac.update(credentials.password);
        let receivedHash = hmac.digest("hex");
        if (passwordHash == receivedHash) {
          if (AdminClient.adminsConnected > 0) {
            this.errorMessage("anotherAdminConnected");
            return;
          }

          this.loggedIn = true;
          this.username = credentials.username
          AdminClient.activeAdmin = this;
          AdminClient.adminsConnected++;
          this.statusMessage();
          this.sendPolls();
          Log.i("Admin " + this.username + " successfully logged in");
          return;
        }
      }

      this.errorMessage("wrongLogin");
      Log.d("Admin " + credentials.username + " did not enter the correct login credentials");
    }

    public onLogout() : void {
      if (this.loggedIn) {
        Log.i("Admin " + AdminClient.activeAdmin.username + " logged out");
        AdminClient.adminsConnected--;
        AdminClient.activeAdmin = null;
      }
      this.loggedIn = false;
    }

    public isLoggedIn() : boolean {
      return this.loggedIn;
    }

  }

}
