import { env } from '../env';

export type WebEnv = typeof env;

export const getPublicEnv = () => env;
export const getServerEnv = () => env;
