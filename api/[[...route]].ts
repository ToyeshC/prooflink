import { handle } from 'hono/vercel';
import { app } from '../src/api/oracle.js';

export default handle(app);
