import { Request } from 'express';

interface JwtPayload {
  sub: number;
  username: string;
}
interface UserPayload {
  id: number;
  username: string;
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}

export type JwtPayloadWithRt = JwtPayload & {
  refreshToken: string;
};

interface SocketData {
  user: JwtPayload;
}
