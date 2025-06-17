// app/api/quote/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const fromTokenAddress = searchParams.get('fromTokenAddress');
  const toTokenAddress = searchParams.get('toTokenAddress');
  const amount = searchParams.get('amount');
  const chainId = searchParams.get('chainId');

  const url = `https://api.1inch.dev/swap/v5.2/${chainId}/quote?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}`;
  const response = await fetch(url, {
      headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
      },
  });

  const data = await response.json();
  return NextResponse.json(data);
}
