import { NextResponse, type NextRequest } from 'next/server';

type GooglePlacePrediction = {
  place_id: string;
  description: string;
};

type GooglePlacesResponse = {
  predictions: GooglePlacePrediction[];
  status: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  if (!apiKey) {
    return NextResponse.json([], { status: 200 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('types', 'address');
  url.searchParams.set('components', 'country:us');
  url.searchParams.set('language', 'en');

  const response = await fetch(url.toString());

  if (!response.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const data = (await response.json()) as GooglePlacesResponse;
  const results = (data.predictions ?? []).map((item) => ({
    id: item.place_id,
    label: item.description
  }));

  return NextResponse.json(results);
}
