/// <reference path="../server.ts" />

namespace Server {

  export class Client {

    protected socket : any;

    constructor(socket : any) {
      this.socket = socket;
    }

    public errorMessage(message : string) : void {
      this.socket.emit("apperror", message);
    }

  }

}
