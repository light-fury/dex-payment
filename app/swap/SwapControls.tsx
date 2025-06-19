interface SwapControlsProps {
  amount: string;
  setAmount: (val: string) => void;
  slippage: number;
  setSlippage: (val: number) => void;
  onQuote: () => void;
  onSwap: () => void;
}
  
export default function SwapControls({ amount, setAmount, slippage, setSlippage, onQuote, onSwap }: SwapControlsProps) {
  return (
    <>
      <input
        type="number"
        min="0"
        step="any"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full border p-2 rounded mb-2"
      />
      <input
        type="number"
        min="0"
        step="0.1"
        placeholder="Slippage %"
        value={slippage}
        onChange={(e) => setSlippage(parseFloat(e.target.value))}
        className="w-full border p-2 rounded mb-4"
      />
      <div className="flex gap-2">
        <button onClick={onQuote} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Get Quote
        </button>
        <button onClick={onSwap} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">
          Swap
        </button>
      </div>
    </>
  );
}
  