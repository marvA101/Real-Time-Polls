/// <reference path="../server.ts" />

namespace Server {

  export class Client {

    protected socket : any;

    constructor(socket : any) {
      this.socket = socket;
    }

      this.socket.emit("apperror", message, translationContext);
    }

  }

}
