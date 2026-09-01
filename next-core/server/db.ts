import postgres from 'postgres';
import {env} from './env.js';

export const sql = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 5,
  idle_timeout: 2,
  connect_timeout: 10
});
