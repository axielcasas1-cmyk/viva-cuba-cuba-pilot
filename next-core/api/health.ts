import {healthPayload} from '../server/health.js';

type ResponseLike = {status:(code:number)=>ResponseLike;json:(value:unknown)=>void};
export default function handler(_req: unknown, res: ResponseLike) {
  res.status(200).json(healthPayload());
}
