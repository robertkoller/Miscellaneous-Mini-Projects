
import React, { useState } from 'react';
import { FakeVirusAlert } from './components/FakeVirusAlert';
import { ValentineProposal } from './components/ValentineProposal';

type ViewState = 'SCAM' | 'PROPOSAL';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('SCAM');

  const handleClearVirus = () => {
    setView('PROPOSAL');
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {view === 'SCAM' ? (
        <FakeVirusAlert onClear={handleClearVirus} />
      ) : (
        <ValentineProposal />
      )}
    </div>
  );
};

export default App;
