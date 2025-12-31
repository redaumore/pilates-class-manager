import React from 'react';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <SignedOut>
                <LandingPage />
            </SignedOut>
            <SignedIn>
                <Dashboard />
            </SignedIn>
        </div>
    );
};

export default App;