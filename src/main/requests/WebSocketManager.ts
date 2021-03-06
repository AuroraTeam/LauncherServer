/**
 * AuroraLauncher LauncherServer - Server for AuroraLauncher
 * Copyright (C) 2020 - 2021 AuroraTeam

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as http from "http"

import { NIL as NIL_UUID } from "uuid"
import * as ws from "ws"

import { JsonHelper } from "../helpers/JsonHelper"
import { LogHelper } from "../helpers/LogHelper"
import { RequestsManager } from "./RequestsManager"
import { wsErrorResponse, wsRequest, wsResponse } from "./types/AbstractRequest"

export class WebSocketManager {
    webSocketServer: ws.Server
    requestsManager: RequestsManager = new RequestsManager()

    webSocketServerInit(wsServerOptions: ws.ServerOptions): void {
        this.webSocketServer = new ws.Server(wsServerOptions)
        this.webSocketServer.on("connection", (ws: ws, req: http.IncomingMessage) => this.requestListener(ws, req))
    }

    requestListener(ws: ws, req: http.IncomingMessage): void {
        ws.on("message", (message: string) => {
            LogHelper.dev(`New WebSocket request ${message}`)
            let data: wsRequest & {
                data: {
                    ip: string
                }
            }

            try {
                data = JsonHelper.toJSON(message)
            } catch (error) {
                return this.wsSend(ws, {
                    uuid: NIL_UUID,
                    code: 100,
                    message: error.message,
                })
            }

            if (data.uuid === undefined) {
                return this.wsSend(ws, {
                    uuid: NIL_UUID,
                    code: 101,
                    message: "Request UUID is undefined",
                })
            }
            if (data.type === undefined) {
                return this.wsSend(ws, {
                    uuid: data.uuid,
                    code: 101,
                    message: "Request type is undefined",
                })
            }

            if (data.data === undefined) data.data = { ip: req.socket.remoteAddress }
            else data.data.ip = req.socket.remoteAddress

            this.wsSend(ws, this.requestsManager.getRequest(data))
        })
    }

    private wsSend(ws: ws, data: wsResponse | wsErrorResponse): void {
        ws.send(JsonHelper.toString(data))
    }
}
