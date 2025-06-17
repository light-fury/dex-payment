'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import TokenSelectorModal from './TokenSelectorModal';
import SwapControls from './SwapControls';
import QuoteDisplay from './QuoteDisplay';

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

type Network = 'evm' | 'solana';

const ONEINCH_CHAIN_ID = 1;
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export default function SwapContainer() {
  const [network, setNetwork] = useState<Network>('evm');

  const [evmTokens, setEvmTokens] = useState<TokenInfo[]>([]);
  const [solanaTokens, setSolanaTokens] = useState<TokenInfo[]>([]);

  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);

  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);

  // Wallet providers
  const [evmProvider, setEvmProvider] = useState<ethers.BrowserProvider | null>(null);
  const [phantom, setPhantom] = useState<any>(null);

  // Quotes
  const [evmQuote, setEvmQuote] = useState<any>(null);
  const [solanaQuote, setSolanaQuote] = useState<any>(null);

  // Modal state
  const [tokenModalOpen, setTokenModalOpen] = useState<null | 'from' | 'to'>(null);

  // Toast for user feedback
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setNetwork((typeof window !== 'undefined' && localStorage.getItem('network') === 'solana') ? 'solana' : 'evm');
    setSlippage(parseFloat(localStorage.getItem('slippage') ?? '0.5'))

    // EVM wallet (MetaMask, etc)
    if ((window as any).ethereum) {
      setEvmProvider(new ethers.BrowserProvider((window as any).ethereum));
    }

    // Phantom wallet for Solana
    if ((window as any).solana?.isPhantom) {
      setPhantom((window as any).solana);
    }

    // Fetch tokens
    fetch('https://tokens.uniswap.org')
      .then((res) => res.json())
      .then((data) => setEvmTokens(data.tokens))
      .catch(() => setToast('Failed to load EVM tokens'));

    fetch('https://token.jup.ag/all')
      .then((res) => res.json())
      .then((data) => {
        setSolanaTokens((data as TokenInfo[]).slice(0, 1000));
      })
      .catch(() => setToast('Failed to load Solana tokens'));

    // Load localStorage
    const from = localStorage.getItem('fromToken');
    const to = localStorage.getItem('toToken');
    if (from) setFromToken(JSON.parse(from));
    if (to) setToToken(JSON.parse(to));
  }, []);

  // Persist settings
  useEffect(() => {
    if (fromToken) localStorage.setItem('fromToken', JSON.stringify(fromToken));
  }, [fromToken]);

  useEffect(() => {
    if (toToken) localStorage.setItem('toToken', JSON.stringify(toToken));
  }, [toToken]);

  useEffect(() => {
    localStorage.setItem('slippage', slippage.toString());
  }, [slippage]);

  useEffect(() => {
    localStorage.setItem('network', network);
  }, [network]);

  // Show toast for 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // EVM quote
  const getEvmQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || !evmProvider) {
      setToast('Select tokens, amount, and connect wallet');
      return;
    }

    try {
      const amountInWei = ethers.parseUnits(amount, fromToken.decimals).toString();
      const res = await fetch(
        `/api/quote?fromTokenAddress=${fromToken.address}&toTokenAddress=${toToken.address}&amount=${amountInWei}&chainId=${ONEINCH_CHAIN_ID}`
      );
      if (!res.ok) throw new Error('1inch quote fetch failed');
      const data = await res.json();
      console.log(data)
      setEvmQuote(data);
    } catch (e: any) {
      setToast(`EVM quote error: ${e.message}`);
    }
  }, [fromToken, toToken, amount, evmProvider]);

  // Execute EVM swap
  const executeEvmSwap = useCallback(async () => {
    if (!fromToken || !toToken || !amount || !evmProvider) {
      setToast('Select tokens, amount, and connect wallet');
      return;
    }

    try {
      await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const signer = await evmProvider.getSigner();
      const fromAddress = await signer.getAddress();
      const amountInWei = ethers.parseUnits(amount, fromToken.decimals).toString();
      const res = await fetch(`/api/swap?fromTokenAddress=${fromToken.address}&toTokenAddress=${toToken.address}&amount=${amountInWei}&fromAddress=${fromAddress}&slippage=${slippage}&chainId=${ONEINCH_CHAIN_ID}`);
      // const swapUrl = `https://api.1inch.dev/v5.2/${ONEINCH_CHAIN_ID}/swap?fromTokenAddress=${fromToken.address}&toTokenAddress=${toToken.address}&amount=${amountInWei}&fromAddress=${fromAddress}&slippage=${slippage}&disableEstimate=true`;
      // const res = await fetch(swapUrl, { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}` } });
      if (!res.ok) throw new Error('Failed to get swap transaction data');

      const data = await res.json();
      if (!data.tx) throw new Error('Swap transaction data missing');

      const txResponse = await signer.sendTransaction(data.tx);
      setToast(`Swap Tx sent: ${txResponse.hash}`);

      await txResponse.wait();
      setToast('Swap confirmed!');
    } catch (e: any) {
      setToast(`Swap failed: ${e.message}`);
    }
  }, [fromToken, toToken, amount, evmProvider, slippage]);

  // Get Solana quote from Jupiter
  const getSolanaQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount) {
      setToast('Select tokens and amount');
      return;
    }

    try {
      const amountInBaseUnits = Math.floor(parseFloat(amount) * 10 ** fromToken.decimals);

      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken.address}&outputMint=${toToken.address}&amount=${amountInBaseUnits}&slippageBps=${Math.floor(slippage * 100)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Jupiter quote fetch failed');

      const data = await res.json();
      setSolanaQuote(data);
    } catch (e: any) {
      setToast(`Solana quote error: ${e.message}`);
    }
  }, [fromToken, toToken, amount, slippage]);

  // Execute Solana swap using Jupiter + Phantom
  const executeSolanaSwap = useCallback(async () => {
    if (!phantom || !fromToken || !toToken || !amount) {
      setToast('Select tokens and connect Phantom wallet');
      return;
    }

    try {
      const connection = new Connection(SOLANA_RPC);
      const userPubkey = phantom.publicKey;
      if (!userPubkey) throw new Error('Phantom wallet not connected');

      const amountInBaseUnits = Math.floor(parseFloat(amount) * 10 ** fromToken.decimals);

      const quoteRes = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${fromToken.address}&outputMint=${toToken.address}&amount=${amountInBaseUnits}&slippageBps=${Math.floor(slippage * 100)}`);
      if (!quoteRes.ok) throw new Error('Failed to fetch Jupiter quote');

      const quoteData = await quoteRes.json();
      if (!quoteData.data?.length) throw new Error('No swap routes found');

      const route = quoteData.data[0];

      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route,
          userPublicKey: userPubkey.toString(),
          wrapUnwrapSOL: true,
          computeUnitPriceMicroLamports: 0,
        }),
      });
      if (!swapRes.ok) throw new Error('Failed to fetch swap transaction');

      const swapData = await swapRes.json();
      if (!swapData.swapTransaction) throw new Error('Swap transaction missing');

      const tx = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
      const signedTx = await phantom.signTransaction(tx);

      const txid = await connection.sendRawTransaction(signedTx.serialize());
      setToast(`Swap sent, Txid: ${txid}`);
    } catch (e: any) {
      setToast(`Solana swap error: ${e.message}`);
    }
  }, [phantom, fromToken, toToken, amount, slippage]);

  // Tokens for modal
  const tokensForModal = network === 'evm' ? evmTokens : solanaTokens;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Token Swap</h1>

      {/* Network selector */}
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded ${network === 'evm' ? 'bg-blue-600 text-white' : 'border'}`}
          onClick={() => setNetwork('evm')}
        >
          EVM
        </button>
        <button
          className={`flex-1 py-2 rounded ${network === 'solana' ? 'bg-blue-600 text-white' : 'border'}`}
          onClick={() => setNetwork('solana')}
        >
          Solana
        </button>
      </div>

      {/* Token selectors */}
      <div className="flex gap-4">
        <button
          className="flex-1 border p-2 rounded flex items-center gap-2"
          onClick={() => setTokenModalOpen('from')}
        >
          {fromToken ? (
            <>
              <img src={fromToken.logoURI} alt={fromToken.symbol} width={24} height={24} className="rounded-full" />
              <span>{fromToken.symbol}</span>
            </>
          ) : (
            <span>Select From Token</span>
          )}
        </button>

        <button
          className="flex-1 border p-2 rounded flex items-center gap-2"
          onClick={() => setTokenModalOpen('to')}
        >
          {toToken ? (
            <>
              <img src={toToken.logoURI} alt={toToken.symbol} width={24} height={24} className="rounded-full" />
              <span>{toToken.symbol}</span>
            </>
          ) : (
            <span>Select To Token</span>
          )}
        </button>
      </div>

      <SwapControls
        amount={amount}
        setAmount={setAmount}
        slippage={slippage}
        setSlippage={setSlippage}
        onQuote={network === 'evm' ? getEvmQuote : getSolanaQuote}
        onSwap={network === 'evm' ? executeEvmSwap : executeSolanaSwap}
      />

      <QuoteDisplay network={network} fromAmount={amount} evmQuote={evmQuote} solanaQuote={solanaQuote} fromToken={fromToken} toToken={toToken} />

      {tokenModalOpen && (
        <TokenSelectorModal
          tokens={tokensForModal}
          onSelect={(token: TokenInfo) => {
            if (tokenModalOpen === 'from') setFromToken(token);
            else if (tokenModalOpen === 'to') setToToken(token);
            setTokenModalOpen(null);
          }}
          onClose={() => setTokenModalOpen(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
