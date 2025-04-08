import logger from '@/utils/logger';

async function get(endpoint: string) {

    const url = `/api/${endpoint}`
    logger.info(`Fetching data from api - ${url}`);
    
    try {
        const response = await fetch(
            url,
            { cache: 'no-store' }
        )

        if (response.ok) {
            logger.info(`Data retireved successfully from - /api/${endpoint}`);
        }

        return response;
    } catch (error) {
        logger.error(`API failed: /api/${endpoint}`);
        return Response.json({ error: `Failed to retrieve products - \n\n${error}` }, { status: 500 });
    }
}

const fetchHelper = {
    get,
}

export default fetchHelper;