/// <reference path="../server.ts" />

namespace Server {

  export class Client {

    protected socket : any;

    constructor(socket : any) {
      this.socket = socket;
    }

    public errorMessage(message : string, translationContext : {[index : string] : string} = {}) : void {
      this.socket.emit("apperror", message, translationContext);
    }

  }

}
