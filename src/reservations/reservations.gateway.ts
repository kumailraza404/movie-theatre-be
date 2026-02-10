import "dotenv/config";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
})
export class ReservationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor() {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join-showtime")
  handleJoinShowtime(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { showtimeId: string },
  ) {
    client.join(`showtime:${data.showtimeId}`);
    console.log(`Client ${client.id} joined showtime ${data.showtimeId}`);
  }

  @SubscribeMessage("leave-showtime")
  handleLeaveShowtime(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { showtimeId: string },
  ) {
    client.leave(`showtime:${data.showtimeId}`);
    console.log(`Client ${client.id} left showtime ${data.showtimeId}`);
  }

  broadcastSeatUpdate(showtimeId: string, availability: any) {
    this.server.to(`showtime:${showtimeId}`).emit("seat-update", availability);
  }
}
