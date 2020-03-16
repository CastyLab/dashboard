import {store} from "./store";
import {bus} from "./../main";
import {protobuf, enums} from "./../protocol/protobuf/base";
import {emit} from "./../protocol/messages";
import {Packet} from "./../protocol/protobuf/packet";

class UserWebsocket {
    connect() {

        if (store.state.token === null || store.state.user === null){
            return
        }

        let user = store.state.user;
        this.ws = new WebSocket(`ws://localhost:3000/user`);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            console.log(`Connected to user[${user.id}] ws!`);
            emit(this.ws, enums.EMSG.LOGON, protobuf.LogOnEvent, {
                token: new Buffer(store.state.token),
            });
        };

        this.ws.onerror = e => {
            console.error('Socket encountered error: ', e.message, 'Closing socket');
            this.ws.close();
        };

        this.ws.onclose = () => {
            console.log(`disconnect from user [${user.id}] ws!`);
        };

        this.ws.onmessage = (message) => {
            let packet = new Packet(message.data);
            if (enums.EMSG.UNAUTHORIZED === packet.emsg){
                console.log("Unauthorized! try to refresh token!");
            }
            bus.$emit(enums.EMSG[packet.emsg], packet.data);
        };

        return this.ws;
    }
    sendMessage(message, to) {
        emit(this.ws, enums.EMSG.NEW_CHAT_MESSAGE, protobuf.ChatMsgEvent, {
            message: new Buffer(message),
            to,
        });
    }
    disconnect() {
        if (typeof this.ws !== 'undefined' && this.ws !== null){
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
                this.ws = null;
            }
        }
    }
}

class TheaterWebsocket {
    connect(room) {

        if (store.state.token == null || store.state.user == null){
            return
        }

        this.ws = new WebSocket(`ws://localhost:3000/theater`);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            emit(this.ws, enums.EMSG.THEATER_LOGON, protobuf.TheaterLogOnEvent, {
                room:  new Buffer(room),
                token: new Buffer(store.state.token),
            });
        };

        this.ws.onerror = e => {
            console.error('Socket encountered error: ', e.message, 'Closing socket');
            this.ws.close();
        };

        this.ws.onclose = () => {
            console.log(`disconnect from theater [${room}] ws!`);
        };

        this.ws.onmessage = (message) => {

            let packet = new Packet(message.data);

            if (packet.emsg === enums.EMSG.AUTHORIZED) {
                store.dispatch("getTheaterMembers", room).then(response => {
                    bus.$emit("theater-connected", response.data.result);
                }).catch(err => {
                    console.log(err);
                });
            } else {
                bus.$emit(enums.EMSG[packet.emsg], packet.data);
            }

        };

        return this.ws;
    }
    disconnect() {
        if (typeof this.ws !== 'undefined' && this.ws !== null){
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
                this.ws = null;
            }
        }
    }
}

export const websocket = {
    user:    new UserWebsocket(),
    theater: new TheaterWebsocket(),
};