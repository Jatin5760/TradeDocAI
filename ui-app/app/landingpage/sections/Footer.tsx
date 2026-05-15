import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="relative mt-10 sm:mt-20 pt-4 sm:pt-8 pb-4 sm:pb-12 overflow-hidden bg-slate-50 border-t border-slate-200">
            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Merged CTA Section - Styled as a Solid Indigo Card with Shades */}
                <div className="relative mb-16 sm:mb-24 bg-linear-to-br from-indigo-600 to-indigo-700 rounded-[2.5rem] sm:rounded-[4rem] p-8 md:p-14 lg:p-16 shadow-2xl shadow-indigo-900/20 overflow-hidden text-center text-white">
                    {/* Subtle Background Shades */}
                    <div className="absolute -right-24 -top-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />
                    <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-indigo-400/20 blur-3xl rounded-full" />
                    
                    <div className="relative z-10">
                        <h2 className="font-display text-2xl sm:text-3xl md:text-3xl lg:text-5xl text-white mb-4 sm:mb-6 tracking-tight leading-[1.1]">
                            Eliminate manual <span className="text-white">confirmation</span> <br className="hidden md:block" /> work today.
                        </h2>
                        <p className="text-indigo-100 mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-lg md:text-xl leading-relaxed font-medium">
                            Automate your full trade pipeline: extraction, generation, and validation in seconds.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center items-center w-full max-w-[240px] sm:max-w-none mx-auto">
                            <Link href="/login" className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 bg-white text-indigo-600 rounded-xl sm:rounded-2xl font-bold text-[15px] md:text-lg lg:text-lg shadow-xl shadow-indigo-900/40 hover:bg-slate-50 hover:-translate-y-0.5 transition-all text-center duration-200">
                                Launch Demo App
                            </Link>
                            <Link href="/signup" className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 bg-transparent border-2 border-white/30 text-white rounded-xl sm:rounded-2xl font-bold text-[15px] md:text-lg lg:text-lg hover:bg-white/10 hover:-translate-y-0.5 transition-all text-center duration-200">
                                Create Account →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Optimized Footer Grid */}
                {/* Desktop & Tablet View: Preserving original 3-column layout */}
                <div className="hidden md:grid grid-cols-3 gap-12 mb-20 border-t border-slate-200 pt-20">
                    {/* Left: Branding */}
                    <div className="flex flex-col items-start justify-start">
                        <Image src="/logo.svg" alt="TradeDocAI Logo" width={56} height={56} className="mb-4 drop-shadow-xl" />
                        <span className="text-slate-900 text-2xl font-bold tracking-tight">TradeDoc<span className="text-indigo-600">AI</span></span>
                        <p className="text-slate-400 text-[11px] mt-4 font-medium text-left leading-relaxed">
                            © 2026 TradeDocAI · Team challengers404 <br /> VIT Bhopal · Virtusa Jatayu
                        </p>
                        <div className="mt-6 flex flex-col items-start gap-1">
                            <span className="text-[9px] text-slate-400 uppercase tracking-[2px] font-bold">Supported by</span>
                            <span className="text-sm font-bold text-slate-700 tracking-tight">Virtusa</span>
                        </div>
                    </div>

                    {/* Middle: Product */}
                    <div className="text-center">
                        <h4 className="text-slate-900 font-bold mb-6 text-sm uppercase tracking-widest font-display">Product</h4>
                        <ul className="space-y-4">
                            <li><Link href="#features" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">How it Works</Link></li>
                            <li><Link href="#supported-docs" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">Supported Documents</Link></li>
                            <li><Link href="#why-tradedoc" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">Comparison Guide</Link></li>
                            <li><Link href="#pricing" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">Pricing Economics</Link></li>
                        </ul>
                    </div>

                    {/* Right: Resources */}
                    <div className="text-right">
                        <h4 className="text-slate-900 font-bold mb-6 text-sm uppercase tracking-widest font-display">Resources</h4>
                        <ul className="space-y-4">
                            <li><Link href="/login" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">Launch Demo App</Link></li>
                            <li><Link href="/signup" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">Create Account</Link></li>
                            <li><Link href="mailto:support@tradedoc.ai" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">Support Email</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Mobile View: OpenAI Style Alignment (ONLY for mobile) */}
                <div className="md:hidden border-t border-slate-200 pt-10 pb-8">
                    {/* Logo Top Left */}
                    <div className="mb-10 flex items-center gap-3">
                        <Image src="/logo.svg" alt="TradeDocAI Logo" width={36} height={36} />
                        <span className="text-slate-900 text-lg font-bold tracking-tight">TradeDoc<span className="text-indigo-600">AI</span></span>
                    </div>

                    {/* Links 2 Columns */}
                    <div className="grid grid-cols-2 gap-8 mb-12">
                        <div>
                            <h4 className="text-slate-900 font-bold mb-4 text-sm">Product</h4>
                            <ul className="space-y-3">
                                <li><Link href="#features" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-[13px]">How it Works</Link></li>
                                <li><Link href="#supported-docs" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-[13px]">Supported Docs</Link></li>
                                <li><Link href="#why-tradedoc" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-[13px]">Comparison</Link></li>
                                <li><Link href="#pricing" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-[13px]">Pricing</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-slate-900 font-bold mb-4 text-sm">Resources</h4>
                            <ul className="space-y-3">
                                <li><Link href="/login" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-[13px]">Demo App</Link></li>
                                <li><Link href="/signup" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-[13px]">Account</Link></li>
                                <li><Link href="mailto:support@tradedoc.ai" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium text-[13px]">Support</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Separator + Copyright Bottom */}
                    <div className="border-t border-slate-200 pt-6 flex flex-col gap-4">
                        <p className="text-slate-500 text-[11px] font-medium">
                            © 2026 TradeDocAI · Team challengers404 <br /> VIT Bhopal
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Supported by</span>
                            <span className="text-sm font-bold text-slate-700 tracking-tight">Virtusa</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
