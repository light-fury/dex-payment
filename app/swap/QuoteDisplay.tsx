import { ethers } from 'ethers';

interface TokenInfo {
  symbol: string;
  decimals: number;
}

export default function QuoteDisplay({
  network,
  evmQuote,
  solanaQuote,
  fromToken,
  toToken,
}: {
  network: 'evm' | 'solana';
  evmQuote: any;
  solanaQuote: any;
  fromToken: TokenInfo | null;
  toToken: TokenInfo | null;
}) {
  if (network === 'evm' && evmQuote && fromToken && toToken) {
    return (
      <pre className="bg-gray-100 p-2 overflow-x-auto text-xs whitespace-pre-wrap">
        From: {ethers.formatUnits(evmQuote.fromTokenAmount, fromToken.decimals)} {fromToken.symbol}
        {'\n'}
        To: {ethers.formatUnits(evmQuote.toTokenAmount, toToken.decimals)} {toToken.symbol}
        {'\n'}
        Estimated Gas: {evmQuote.estimatedGas}
      </pre>
    );
  }

  if (network === 'solana' && solanaQuote) {
    const route = solanaQuote.routePlan || [];
    return (
      <>
        {route.map((individualRoute: any, index: number) => (
          <pre key={individualRoute.swapInfo?.label || index} className="bg-gray-100 p-2 text-xs whitespace-pre-wrap">
            From: {(individualRoute.swapInfo?.inAmount / Math.pow(10, fromToken?.decimals || 0)).toFixed(6)} {fromToken?.symbol}
            {'\n'}
            To: {(individualRoute.swapInfo?.outAmount / Math.pow(10, toToken?.decimals || 0)).toFixed(6)} {toToken?.symbol}
            {'\n'}
            Percent: {individualRoute.percent}%
          </pre>
        ))}
        {'\n'}
        <pre className="bg-gray-100 p-2 text-xs whitespace-pre-wrap">
          Price Impact: {(solanaQuote?.priceImpactPct * 100).toFixed(2)}%
        </pre>
      </>
    );
  }

  return null;
}
