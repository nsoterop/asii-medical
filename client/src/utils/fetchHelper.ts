import logger from '@/utils/logger';

const baseApiUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api`;

async function get(endpoint: string) {

    logger.info(`Fetching data from api - /api/${endpoint}`);
    
    try {
        const response = await fetch(
            `${baseApiUrl}/${endpoint}`,
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