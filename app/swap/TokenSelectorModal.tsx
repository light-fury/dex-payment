import { useState, useEffect } from 'react';
import { TokenInfo } from '../lib/utils';

export default function TokenSelectorModal({
  tokens,
  onSelect,
  onClose,
}: {
  tokens: TokenInfo[];
  onSelect: (token: TokenInfo) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<TokenInfo[]>(tokens);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredTokens(tokens.filter((t) => t.address.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)));
  }, [search, tokens]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div className="bg-white rounded-lg max-w-md w-full max-h-[70vh] overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Select Token</h2>
        <input
          placeholder="Search tokens"
          className="w-full p-2 mb-4 border rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <ul className="space-y-2 max-h-64 overflow-auto">
          {filteredTokens.map((token, index) => (
            <li
              key={`${token.address}-${index}`}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-200 p-2 rounded"
              onClick={() => onSelect(token)}
            >
              <img src={token.logoURI} alt={token.symbol} width={24} height={24} className="rounded-full" />
              <span>{token.symbol}</span>
              <span className="text-gray-500 ml-auto">{token.name}</span>
            </li>
          ))}
          {filteredTokens.length === 0 && <li className="text-center text-gray-500">No tokens found</li>}
        </ul>
      </div>
    </div>
  );
}
