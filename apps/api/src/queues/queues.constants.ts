export const REDIS_CONNECTION = 'REDIS_CONNECTION';

export const IMPORTS_QUEUE = 'IMPORTS_QUEUE';
export const IMPORTS_QUEUE_NAME = 'imports';

export const QUEUE_DEFINITIONS = [{ token: IMPORTS_QUEUE, name: IMPORTS_QUEUE_NAME }] as const;
