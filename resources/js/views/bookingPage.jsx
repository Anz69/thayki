import TransitionLink from '@/components/TransitionLink'

export default function BookingPage() {
    return (
        <main className="flex flex-col gap-10 pt-4">
            <header className="w-full py-5 border-b border-white bg-white/90 backdrop-blur-xs sticky top-0 z-50">
                <div className="container relative">
                    <TransitionLink to="/home" className="absolute left-4 top-1/2 -translate-y-1/2 px-2.5 py-3 bg-[#EFEEF3] text-black text-base/[80%] font-medium hover:bg-[#E0DEDF] transition-all duration-300 cursor-pointer rounded-full">
                        На главную
                    </TransitionLink>
                    <h1 className="text-black text-2xl/[100%] font-medium">Встреча</h1>
                </div>
            </header>
            <section > 
            </section>
        </main>
    )
}