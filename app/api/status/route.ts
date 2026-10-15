import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {apiStatus} from '../../../server/draft-api.mjs';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();return Response.json(user?apiStatus(env):{ready:false,error:'로그인이 필요합니다.'},{status:user?200:401,headers:{'Cache-Control':'no-store'}});}
