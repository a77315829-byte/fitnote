import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handleDraft} from '../../../server/draft-api.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){const user=await getChatGPTUser();return handleDraft(request,env,user?.userId);}
