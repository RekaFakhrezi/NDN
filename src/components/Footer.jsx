export default function Footer() {
    return (
        <footer className="w-full mt-12">

            {/* === BAGIAN UTAMA FOOTER (Dark Gray dengan Top Border Merah) === */}
            {/* Padding dibuat adaptif: lebih ramping di mobile, longgar di desktop */}
            <div className="bg-[#1a1a1a] border-t-4 border-t-[#bd2828] pt-10 pb-8 md:pt-14 md:pb-12 px-4 md:px-6">
                {/* Menggunakan kombinasi grid cerdas: 1 kolom di HP, 2 kolom di tablet, 12 kolom di desktop */}
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 md:gap-6 lg:gap-8 text-white">

                    {/* Kolom 1: Brand */}
                    <div className="sm:col-span-2 md:col-span-4 space-y-4">
                        <h2 className="text-lg md:text-xl font-serif font-bold tracking-wide">NDN: Nusantara Daily News</h2>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md pr-2">
                            Sumber berita terpercaya yang menyajikan informasi mendalam dari seluruh pelosok Nusantara.
                        </p>
                        {/* Ikon Sosmed */}
                        <div className="flex gap-3 pt-2">
                            <button className="w-9 h-9 rounded border border-gray-600 flex items-center justify-center hover:bg-gray-700 hover:text-white text-gray-400 transition cursor-pointer">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
</svg>
                            </button>
                            <button className="w-9 h-9 rounded border border-gray-600 flex items-center justify-center hover:bg-gray-700 hover:text-white text-gray-400 transition cursor-pointer">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Kolom 2: Informasi */}
                    <div className="sm:col-span-1 md:col-span-2">
                        <h3 className="text-[11px] font-bold text-[#d44c4c] tracking-[0.15em] mb-4 uppercase">Informasi</h3>
                        <ul className="text-sm space-y-2.5 text-gray-300 font-medium">
                            <li><a href="#" className="hover:text-white transition">About NDN</a></li>
                            <li><a href="#" className="hover:text-white transition">Editorial Policy</a></li>
                            <li><a href="#" className="hover:text-white transition">Career</a></li>
                        </ul>
                    </div>

                    {/* Kolom 3: Bantuan */}
                    <div className="sm:col-span-1 md:col-span-2">
                        <h3 className="text-[11px] font-bold text-[#d44c4c] tracking-[0.15em] mb-4 uppercase">Bantuan</h3>
                        <ul className="text-sm space-y-2.5 text-gray-300 font-medium">
                            <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                            <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                            <li><a href="#" className="hover:text-white transition">FAQ</a></li>
                        </ul>
                    </div>

                    {/* Kolom 4: Newsletter */}
                    <div className="sm:col-span-2 md:col-span-4 space-y-3">
                        <h3 className="text-[11px] font-bold text-[#d44c4c] tracking-[0.15em] mb-2 uppercase">Newsletter</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">Dapatkan ringkasan berita terbaik setiap pagi.</p>
                        <div className="flex h-[42px] max-w-md">
                            <input
                                type="email"
                                placeholder="Email Anda"
                                className="bg-[#2c2c2c] text-white px-4 text-sm w-full outline-none rounded-l-md border border-transparent focus:border-red-500 transition"
                            />
                            <button className="bg-[#bd2828] text-white px-6 text-sm font-bold hover:bg-red-800 transition rounded-r-md cursor-pointer shrink-0">
                                Ikuti
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* === BOTTOM BAR (Hitam Pekat / Pure Black) === */}
            <div className="bg-[#0a0a0a] py-5 px-4 md:px-6">
                {/* Flex direction otomatis menumpuk vertikal di mobile, sejajar di desktop */}
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[11px] md:text-[11.5px] text-gray-500 font-medium tracking-wide text-center md:text-left gap-3 md:gap-0">
                    <p>© 2024 Nusantara Daily News. Suara Rakyat, Kebanggaan Bangsa.</p>
                    <div className="flex gap-6 sm:gap-8">
                        <a href="#" className="hover:text-gray-300 transition">Syarat & Ketentuan</a>
                        <a href="#" className="hover:text-gray-300 transition">Kebijakan Cookie</a>
                    </div>
                </div>
            </div>

        </footer>
    );
}