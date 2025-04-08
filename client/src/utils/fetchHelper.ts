import logger from '@/utils/logger';

const baseApiUrl = `${process.env.API_BASE_URL}`;

async function get(endpoint: string) {

    const url = `${baseApiUrl}${endpoint}`
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