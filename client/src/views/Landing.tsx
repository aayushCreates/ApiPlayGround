import { useAuth, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { ArrowRight, TerminalSquare, Zap, Globe, Lock, Menu, X } from "lucide-react";
import { useState } from "react";

export function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base text-primary overflow-x-hidden relative font-sans flex flex-col">
        {/* Background gradient flares */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[150px] pointer-events-none" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-method-get/10 blur-[150px] pointer-events-none" />
        
        {/* Navigation */}
        <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto relative z-50 w-full">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 text-white">
                  <TerminalSquare className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tight">APIPlayground</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4">
                {!isLoaded ? null : isSignedIn ? (
                    <div className="flex items-center gap-4">
                        <Link to="/app" className="text-sm font-medium hover:text-accent transition-colors">
                            Dashboard
                        </Link>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                ) : (
                    <>
                        <SignInButton mode="modal">
                            <button className="text-sm font-medium hover:text-primary text-secondary transition-colors cursor-pointer">
                                Sign In
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-lg shadow-accent/20 cursor-pointer">
                                Get Started
                            </button>
                        </SignUpButton>
                    </>
                )}
            </div>

            {/* Mobile Nav Toggle */}
            <button 
                className="md:hidden p-2 text-secondary hover:text-primary transition-colors cursor-pointer"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
        </nav>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 z-40 bg-base/95 backdrop-blur-lg md:hidden flex flex-col items-center justify-center gap-8 p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center gap-6 w-full max-w-xs">
                    {!isLoaded ? null : isSignedIn ? (
                        <>
                            <Link 
                                to="/app" 
                                className="text-2xl font-bold hover:text-accent transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </>
                    ) : (
                        <>
                            <SignInButton mode="modal">
                                <button className="text-2xl font-bold text-secondary hover:text-primary transition-colors w-full py-4 border-b border-border">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="bg-accent text-white w-full py-4 rounded-xl text-xl font-bold shadow-lg shadow-accent/20">
                                    Get Started Free
                                </button>
                            </SignUpButton>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Hero Section */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-32 flex flex-col items-center text-center flex-1">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-accent-dim text-accent text-sm font-semibold mb-8 border border-accent/20 shadow-sm backdrop-blur-sm">
                <Zap className="w-4 h-4 mr-2" fill="currentColor" />
                The Next-Gen API Testing Tool
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-5xl text-pretty leading-[1.1]">
                Test, Share, and Discover APIs <span className="text-transparent bg-clip-text bg-linear-to-r from-accent to-[#b4c6ff]">with ease.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-secondary mb-12 max-w-2xl text-pretty leading-relaxed px-4">
                A blazingly fast, modern API playground designed for developers. Import specifications, run requests, and collaborate seamlessly.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-6">
                {!isLoaded ? (
                    <div className="w-full sm:w-36 h-14 bg-surface animate-pulse rounded-lg border border-border" />
                ) : isSignedIn ? (
                    <Link to="/app" className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white px-8 py-3.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 group text-lg shadow-lg shadow-accent/20 cursor-pointer">
                        Go to App
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                ) : (
                   <SignUpButton mode="modal">
                        <button className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white px-8 py-3.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 group text-lg shadow-lg shadow-accent/20 cursor-pointer">
                            Start for free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                   </SignUpButton>
                )}
                
                <a href="#features" className="w-full sm:w-auto px-8 py-3.5 rounded-lg font-medium text-primary hover:bg-elevated transition-colors border border-border bg-surface shadow-sm cursor-pointer border-b-2">
                    Explore Features
                </a>
            </div>
            
            {/* Mockup Graphic */}
            <div className="mt-16 md:mt-24 w-full max-w-5xl rounded-2xl border border-border bg-surface/80 p-1 md:p-2 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-tr from-accent/5 to-transparent rounded-2xl pointer-events-none" />
                <div className="rounded-xl overflow-hidden border border-border-subtle bg-base aspect-[16/10] md:aspect-video flex flex-col relative shadow-inner">
                    {/* Header */}
                    <div className="w-full h-10 md:h-12 border-b border-border bg-surface/90 flex items-center px-4 gap-3 z-10 backdrop-blur-md">
                        <div className="flex space-x-1.5 md:space-x-2">
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-danger shadow-sm"></div>
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-warning shadow-sm"></div>
                            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-success shadow-sm"></div>
                        </div>
                        <div className="mx-auto w-32 sm:w-48 md:w-64 h-5 md:h-6 bg-base rounded-md border border-border flex items-center justify-center overflow-hidden">
                            <Lock className="w-2 md:w-3 h-2 md:h-3 text-secondary mr-2 shrink-0" />
                            <span className="text-[10px] md:text-xs text-secondary mono truncate">apiplayground.app</span>
                        </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 flex text-secondary relative z-0 overflow-hidden">
                        {/* Sidebar bg */}
                        <div className="w-48 lg:w-64 border-r border-border p-4 hidden md:block bg-surface/30">
                            <div className="h-5 w-24 bg-border/40 rounded-md mb-6"></div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-4 h-4 rounded bg-method-get"></div>
                                <div className="h-4 w-32 bg-border/20 rounded"></div>
                            </div>
                            <div className="flex items-center gap-2 mb-3 bg-elevated p-2 rounded-md border border-border-subtle -mx-2">
                                <div className="w-4 h-4 rounded bg-method-post"></div>
                                <div className="h-4 w-24 bg-border/40 rounded"></div>
                            </div>
                        </div>
                        {/* Main Editor */}
                        <div className="flex-1 p-3 md:p-6 flex flex-col gap-3 md:gap-4 bg-base overflow-x-auto">
                            <div className="flex flex-col sm:flex-row gap-2 mb-1">
                               <div className="h-9 md:h-11 w-full sm:w-20 md:w-24 bg-method-post/20 border border-method-post/30 rounded-lg text-method-post flex items-center justify-center font-bold text-xs md:text-sm shadow-sm">POST</div>
                               <div className="h-9 md:h-11 flex-1 bg-surface border border-border rounded-lg px-3 md:px-4 flex items-center shadow-inner overflow-hidden">
                                   <span className="text-secondary mono text-[10px] md:text-sm opacity-50 truncate">https://api.example.com/v1/users</span>
                               </div>
                               <div className="h-9 md:h-11 w-full sm:w-24 md:w-28 bg-accent border border-accent rounded-lg text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">Send</div>
                            </div>
                            
                            <div className="flex-1 border border-border rounded-xl bg-surface/50 p-3 md:p-4 shadow-inner flex flex-col gap-2 relative overflow-hidden min-h-[150px]">
                                <div className="absolute top-0 right-0 left-0 h-8 md:h-10 border-b border-border bg-elevated flex items-center px-4 gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                  <span className="text-[10px] md:text-xs font-semibold text-primary border-b-2 border-accent pb-2 mt-2">Body</span>
                                  <span className="text-[10px] md:text-xs font-medium text-secondary pb-2 mt-2">Headers (2)</span>
                                  <span className="text-[10px] md:text-xs font-medium text-secondary pb-2 mt-2">Auth</span>
                                </div>
                                <div className="pt-10 md:pt-12 font-mono text-[10px] md:text-xs text-primary flex gap-3 md:gap-4">
                                    <div className="text-secondary/50 text-right w-4 select-none">
                                        1<br/>2<br/>3
                                    </div>
                                    <div className="truncate">
                                        <span className="text-secondary">&#123;</span><br/>
                                        &nbsp;&nbsp;<span className="text-[#9cdcfe]">"name"</span>: <span className="text-[#ce9178]">"Dev"</span>,<br/>
                                        <span className="text-secondary">&#125;</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Features section */}
            <div id="features" className="pt-24 md:pt-32 pb-16 w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-left">
                <div className="p-6 md:p-8 border border-border rounded-2xl bg-surface/40 hover:bg-surface/80 transition-all shadow-sm hover:shadow-md group">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 md:6 border border-accent/20 group-hover:scale-110 transition-transform">
                        <Globe className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3 text-primary">Universal Support</h3>
                    <p className="text-sm md:text-base text-secondary leading-relaxed">Import OpenAPI specs easily and automatically generate interactive forms for all your endpoints.</p>
                </div>
                
                <div className="p-6 md:p-8 border border-border rounded-2xl bg-surface/40 hover:bg-surface/80 transition-all shadow-sm hover:shadow-md group">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-success/10 flex items-center justify-center text-success mb-4 md:6 border border-success/20 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3 text-primary">Blazing Fast</h3>
                    <p className="text-sm md:text-base text-secondary leading-relaxed">Built with Vite and React for snappy response times and instant feedback on all your API calls.</p>
                </div>
                
                <div className="p-6 md:p-8 border border-border rounded-2xl bg-surface/40 hover:bg-surface/80 transition-all shadow-sm hover:shadow-md group">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-warning/10 flex items-center justify-center text-warning mb-4 md:6 border border-warning/20 group-hover:scale-110 transition-transform">
                        <Lock className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3 text-primary">Secure & Sync</h3>
                    <p className="text-sm md:text-base text-secondary leading-relaxed">Your data safely synced and authenticated through state of the art protection. Access anywhere.</p>
                </div>
            </div>
        </main>
        
        {/* Footer */}
        <footer className="border-t border-border bg-surface/50 py-8 text-center text-secondary text-xs md:text-sm backdrop-blur-sm z-10 w-full relative px-6">
            <p className="flex flex-col md:flex-row items-center justify-center gap-2">
                <span className="flex items-center gap-2">
                    <TerminalSquare className="w-4 h-4 opacity-50" />
                    © {new Date().getFullYear()} APIPlayground.
                </span>
                <span className="hidden md:inline">|</span>
                <span>All rights reserved.</span>
            </p>
        </footer>
    </div>
  );
}

