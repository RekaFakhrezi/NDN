import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Navbar() {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // State baru untuk menyimpan teks yang diketik di search bar
    const [searchTerm, setSearchTerm] = useState(""); 
    
    const navigate = useNavigate();
    const location = useLocation();

    const fetchUserExtraData = async (sessionUser) => {
        if (!sessionUser) {
            setIsAdmin(false);
            setUnreadCount(0);
            return;
        }

        try {
            const { data: userData } = await supabase
                .from("users")
                .select("id, is_admin")
                .eq("email", sessionUser.email)
                .single();

            if (userData) {
                if (userData.is_admin) setIsAdmin(true);

                const { count, error } = await supabase
                    .from("notifications")
                    .select("*", { count: "exact", head: true })
                    .eq("notifiable_id", userData.id)
                    .eq("notifiable_type", "App\\Models\\User")
                    .is("read_at", null);

                if (!error) {
                    setUnreadCount(count || 0);
                }
            }
        } catch (err) {
            console.error("Gagal sinkronisasi data navbar extras:", err.message);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user || null;
            setUser(currentUser);
            fetchUserExtraData(currentUser);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user || null;
            setUser(currentUser);
            fetchUserExtraData(currentUser);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    // Fungsi untuk memproses pencarian saat tombol Enter ditekan
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/?cari=${encodeURIComponent(searchTerm.trim())}`);
        } else {
            navigate(`/`);
        }
        setIsMenuOpen(false); // Tutup menu mobile jika search dilakukan dari HP
    };

    return (
        <header className="sticky top-0 z-50 w-full shadow-md">
            <nav className="bg-[#bd2828] text-white px-4 md:px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">

                    {/* LOGO */}
                    <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex flex-col shrink-0">
                        <span className="text-xl md:text-2xl font-serif font-bold leading-none tracking-wider">
                            NDN
                            <span className="text-xs md:text-sm font-sans ml-2 font-normal opacity-90 tracking-normal inline-block">
                                Nusantara<br className="hidden md:inline" /> Daily News
                            </span>
                        </span>
                    </Link>

                    {/* SEARCH BAR (Desktop) */}
                    <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8 relative">
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cari berita di NDN..." 
                            className="w-full bg-[#a31d1d] text-white placeholder-red-300 text-sm rounded-md py-2 px-10 focus:outline-none focus:ring-1 focus:ring-white/50 border border-[#a31d1d]" 
                        />
                        <svg className="w-4 h-4 absolute left-3 top-2.5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </form>

                    {/* MENU UTAMA (Desktop) */}
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link to="/" className="hover:text-red-200 transition">Home</Link>

                        {user && (
                            <>
                                <Link to="/submit" className="hover:text-red-200 transition">Submit News</Link>
                                <Link to="/my-articles" className="hover:text-red-200 transition">My Articles</Link>
                            </>
                        )}

                        <Link to={user ? "/notifications" : "/login"} className="hover:text-red-200 cursor-pointer relative p-1 transition" title="Pusat Notifikasi">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-white text-[#bd2828] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#bd2828] animate-bounce shadow-sm">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>

                        {user ? (
                            <div className="flex items-center gap-3">
                                {isAdmin && <Link to="/admin" className="bg-red-900 text-white px-4 py-2 rounded-full font-bold hover:bg-red-800 transition shadow-sm border border-red-700 text-xs tracking-wider uppercase">Admin Panel</Link>}
                                <Link to="/profile" className="bg-white text-[#bd2828] px-5 py-2 rounded-full font-bold hover:bg-gray-100 transition shadow-sm">Profil Saya</Link>
                                <button onClick={handleLogout} title="Keluar" className="text-red-200 hover:text-white transition cursor-pointer p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
                            </div>
                        ) : (
                            <Link to="/login" className="bg-white text-[#bd2828] px-5 py-2 rounded-full font-bold hover:bg-gray-100 transition shadow-sm">Mulai Menulis</Link>
                        )}
                    </div>

                    {/* KELOMPOK MENU MOBILE */}
                    <div className="flex items-center gap-4 md:hidden">
                        <Link to={user ? "/notifications" : "/login"} onClick={() => setIsMenuOpen(false)} className="hover:text-red-200 relative p-1 transition" title="Pusat Notifikasi">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 bg-white text-[#bd2828] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#bd2828] shadow-sm">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>

                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 focus:outline-none text-white hover:text-red-200 transition" aria-label="Toggle Menu">
                            {isMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            )}
                        </button>
                    </div>

                </div>

                {/* LACI DROPDOWN MENU INTERAKTIF DI HP */}
                {isMenuOpen && (
                    <div className="md:hidden bg-[#bd2828] border-t border-red-700/50 px-4 pt-2 pb-4 flex flex-col gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
                        
                        {/* SEARCH BAR (Mobile) */}
                        <form onSubmit={handleSearch} className="relative w-full my-1">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari berita di NDN..." 
                                className="w-full bg-[#a31d1d] text-white placeholder-red-300 text-xs rounded-md py-2.5 pl-10 pr-4 focus:outline-none border border-[#a31d1d]" 
                            />
                            <svg className="w-4 h-4 absolute left-3 top-3 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </form>

                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="hover:bg-red-700/40 px-3 py-2 rounded transition">Home</Link>

                        {user && (
                            <>
                                <Link to="/submit" onClick={() => setIsMenuOpen(false)} className="hover:bg-red-700/40 px-3 py-2 rounded transition">Submit News</Link>
                                <Link to="/my-articles" onClick={() => setIsMenuOpen(false)} className="hover:bg-red-700/40 px-3 py-2 rounded transition">My Articles</Link>
                            </>
                        )}

                        {user ? (
                            <div className="border-t border-red-700/30 pt-2 flex flex-col gap-2">
                                {isAdmin && (
                                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="bg-red-900 text-center text-white px-4 py-2.5 rounded-md font-bold text-xs tracking-wider uppercase">
                                        Admin Panel
                                    </Link>
                                )}
                                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="bg-white text-center text-[#bd2828] px-4 py-2.5 rounded-md font-bold shadow-sm">
                                    Profil Saya
                                </Link>
                                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="text-red-100 hover:text-white text-center bg-red-800/40 py-2.5 rounded-md font-bold mt-1">
                                    Keluar Akun
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="bg-white text-center text-[#bd2828] px-4 py-2.5 rounded-md font-bold shadow-sm mt-1">
                                Mulai Menulis
                            </Link>
                        )}
                    </div>
                )}
            </nav>

            {/* LOGIKA CONDITIONAL RENDERING HANYA UNTUK HOMEPAGE */}
            {location.pathname === "/" && (
                <div className="bg-[#991b1b] text-white text-[10px] md:text-xs py-2 px-4 md:px-6 flex items-center">
                    <div className="max-w-7xl mx-auto w-full flex items-center gap-3 md:gap-4 overflow-hidden">
                        <span className="font-bold bg-[#7f1d1d] px-2 py-0.5 rounded shrink-0 tracking-wide">BREAKING:</span>
                        <p className="truncate opacity-90 whitespace-nowrap">Ibukota Nusantara Siap Diresmikan Bulan Depan. • Presiden Kunjungi Papua Untuk Proyek Strategis. • Kurs Rupiah Menguat Terhadap Dollar AS. • NDN</p>
                    </div>
                </div>
            )}
        </header>
    );
}