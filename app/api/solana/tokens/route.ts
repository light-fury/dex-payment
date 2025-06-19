// app/api/quote/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = 'https://lite-api.jup.ag/tokens/v1/tagged/verified';
  const response = await fetch(url);
  const data = await response.json();
  return NextResponse.json(data);
}
