'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import TokenSelectorModal from './TokenSelectorModal';
import SwapControls from './SwapControls';
import QuoteDisplay from './QuoteDisplay';
import { Button } from '../../components/ui/button';
import { TokenInfo } from '../lib/utils';

type Network = 'evm' | 'solana';

const ONEINCH_CHAIN_ID = 1;
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export default function SwapContainer() {
  const [network, setNetwork] = useState<Network>('evm');

  const [evmTokens, setEvmTokens] = useState<TokenInfo[]>([]);
  const [solanaTokens, setSolanaTokens] = useState<TokenInfo[]>([]);

  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);

  const [fromSolToken, setFromSolToken] = useState<TokenInfo | null>(null);
  const [toSolToken, setToSolToken] = useState<TokenInfo | null>(null);

  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);

  // Wallet providers
  const [evmProvider, setEvmProvider] = useState<ethers.BrowserProvider | null>(null);
  const [phantom, setPhantom] = useState<any>(null);

  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');

  // Quotes
  const [evmQuote, setEvmQuote] = useState<any>(null);
  const [solanaQuote, setSolanaQuote] = useState<any>(null);

  // Modal state
  const [tokenModalOpen, setTokenModalOpen] = useState<null | 'from' | 'to'>(null);

  // Toast for user feedback
  const [toast, setToast] = useState<string | null>(null);

  // Wallet Functions
  const connectPhantomWallet = async () => {
    if (phantom) {
      try {
        const resp = await phantom.connect();
        console.log('Phantom connected:', resp.publicKey.toString());
        setAccount(resp.publicKey.toString());
        // setBalance(resp.);
      } catch (err) {
        console.error('Phantom connect error:', err);
      }
    }
  };

  const connectEvmWallet = async () => {
    if ((window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      setEvmProvider(provider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      const bal = await provider.getBalance(address);
      setBalance(ethers.formatEther(bal));
    }
  };

  const reconnectEvmWallet = async () => {
    if ((window as any).ethereum?.selectedAddress) {
      await connectEvmWallet();
    }
  };

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

    fetch('/api/solana/tokens')
      .then((res) => res.json())
      .then((data) => {
        setSolanaTokens((data as TokenInfo[]));
      })
      .catch(() => setToast('Failed to load Solana tokens'));

    reconnectEvmWallet();
    // Load localStorage
    const from = localStorage.getItem('fromToken');
    const to = localStorage.getItem('toToken');
    if (from) setFromToken(JSON.parse(from));
    if (to) setToToken(JSON.parse(to));
    const fromSol = localStorage.getItem('fromSolToken');
    const toSol = localStorage.getItem('toSolToken');
    if (fromSol) setFromSolToken(JSON.parse(fromSol));
    if (toSol) setToSolToken(JSON.parse(toSol));
  }, []);

  // Persist settings
  useEffect(() => {
    if (fromToken) localStorage.setItem('fromToken', JSON.stringify(fromToken));
  }, [fromToken]);

  useEffect(() => {
    if (toToken) localStorage.setItem('toToken', JSON.stringify(toToken));
  }, [toToken]);
  
  useEffect(() => {
    if (fromSolToken) localStorage.setItem('fromSolToken', JSON.stringify(fromSolToken));
  }, [fromSolToken]);

  useEffect(() => {
    if (toSolToken) localStorage.setItem('toSolToken', JSON.stringify(toSolToken));
  }, [toSolToken]);

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
    if (!fromSolToken || !toSolToken || !amount) {
      setToast('Select tokens and amount');
      return;
    }

    try {
      const amountInBaseUnits = Math.floor(parseFloat(amount) * 10 ** fromSolToken.decimals);

      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${fromSolToken.address}&outputMint=${toSolToken.address}&amount=${amountInBaseUnits}&slippageBps=${Math.floor(slippage * 100)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Jupiter quote fetch failed');

      const data = await res.json();
      setSolanaQuote(data);
      console.log(data);
    } catch (e: any) {
      setToast(`Solana quote error: ${e.message}`);
    }
  }, [fromSolToken, toSolToken, amount, slippage]);

  // Execute Solana swap using Jupiter + Phantom
  const executeSolanaSwap = useCallback(async () => {
    if (!phantom || !fromSolToken || !toSolToken || !amount) {
      setToast('Select tokens and connect Phantom wallet');
      return;
    }

    try {
      const connection = new Connection(SOLANA_RPC);
      const userPubkey = phantom.publicKey;
      if (!userPubkey) throw new Error('Phantom wallet not connected');

      const amountInBaseUnits = Math.floor(parseFloat(amount) * 10 ** fromSolToken.decimals);

      const quoteRes = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${fromSolToken.address}&outputMint=${toSolToken.address}&amount=${amountInBaseUnits}&slippageBps=${Math.floor(slippage * 100)}`);
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
  }, [phantom, fromSolToken, toSolToken, amount, slippage]);

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
          {(network === 'evm' ? fromToken : fromSolToken) ? (
            <>
              <img src={(network === 'evm' ? fromToken : fromSolToken)!.logoURI} alt={(network === 'evm' ? fromToken : fromSolToken)!.symbol} width={24} height={24} className="rounded-full" />
              <span>{(network === 'evm' ? fromToken : fromSolToken)!.symbol}</span>
            </>
          ) : (
            <span>Select From Token</span>
          )}
        </button>

        <button
          className="flex-1 border p-2 rounded flex items-center gap-2"
          onClick={() => setTokenModalOpen('to')}
        >
          {(network === 'evm' ? toToken : toSolToken) ? (
            <>
              <img src={(network === 'evm' ? toToken : toSolToken)!.logoURI} alt={(network === 'evm' ? toToken : toSolToken)!.symbol} width={24} height={24} className="rounded-full" />
              <span>{(network === 'evm' ? toToken : toSolToken)!.symbol}</span>
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

      <QuoteDisplay
        network={network}
        fromAmount={amount}
        evmQuote={evmQuote}
        solanaQuote={solanaQuote}
        fromToken={network === 'evm' ? fromToken : fromSolToken}
        toToken={network === 'evm' ? toToken : toSolToken}
      />

      <div className="flex gap-2">
        <Button onClick={connectEvmWallet}>Connect EVM Wallet</Button>
        <Button onClick={connectPhantomWallet}>Connect Phantom Wallet</Button>
      </div>

      {evmProvider && account && (
        <div className="text-xs text-gray-500">
          Connected: {account} <br /> Balance: {parseFloat(balance).toFixed(4)} ETH
        </div>
      )}

      {tokenModalOpen && (
        <TokenSelectorModal
          tokens={tokensForModal}
          onSelect={(token: TokenInfo) => {
            if (tokenModalOpen === 'from') {
              if (network === 'evm') {
                setFromToken(token);
              } else {
                setFromSolToken(token);
              }
            }
            else if (tokenModalOpen === 'to') {
              if (network === 'evm') {
                setToToken(token);
              } else {
                setToSolToken(token);
              }
            }
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
