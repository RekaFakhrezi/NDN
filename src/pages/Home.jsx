import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Home() {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get("cari") || "");

    // Mengawasi URL: Jika user mengetik pencarian baru di Navbar saat sedang berada di halaman Home
    useEffect(() => {
        setSearchQuery(searchParams.get("cari") || "");
    }, [searchParams]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const { data: catData } = await supabase
                    .from("categories")
                    .select("*")
                    .order("name");

                if (catData) setCategories(catData);

                const { data: artData, error } = await supabase
                    .from("articles")
                    .select("*, categories(name), users(name)")
                    .in("status", ["published", "approved"])
                    .order("created_at", { ascending: false });

                if (error) throw error;
                if (artData) setArticles(artData);

            } catch (error) {
                console.error("Gagal memuat data Home:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "https://images.unsplash.com/photo-1541876751093-68d6d67b7891?q=80&w=1200";
        if (imagePath.startsWith("http")) return imagePath;
        const cleanPath = imagePath.startsWith("articles/") ? imagePath : `articles/${imagePath}`;
        return `https://kbahpvjqnvujodhaauyn.supabase.co/storage/v1/object/public/REACT_NDN/${cleanPath}`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return "Baru Saja";
        const date = new Date(isoString);
        return isNaN(date.getTime())
            ? "Baru Saja"
            : date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    const filteredArticles = articles.filter(article => {
        const matchesCategory = activeCategory === "Semua" || article.categories?.name === activeCategory;
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const heroArticle = filteredArticles.length > 0 ? filteredArticles[0] : null;
    const gridArticles = filteredArticles.length > 1 ? filteredArticles.slice(1) : filteredArticles;

    // Hitung jumlah artikel per kategori untuk mencari Top 3
    const categoryCounts = {};
    articles.forEach(art => {
        if (art.categories?.name) {
            categoryCounts[art.categories.name] = (categoryCounts[art.categories.name] || 0) + 1;
        }
    });

    const sortedCategories = [...categories].sort((a, b) => {
        const countA = categoryCounts[a.name] || 0;
        const countB = categoryCounts[b.name] || 0;
        return countB - countA;
    });

    const top3Categories = sortedCategories.slice(0, 3);
    const remainingCategories = sortedCategories.slice(3);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-t-[#bd2828] border-gray-200 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-gray-500 animate-pulse">Memuat berita terbaru...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans pb-20">

            {/* === HEADLINE UTAMA (HERO SECTION FULL WIDTH & CLICKABLE) === */}
            {heroArticle && !searchQuery ? (
                <Link
                    to={`/artikel/${heroArticle.id}`}
                    className="relative block w-full h-[55vh] sm:h-[65vh] md:h-[80vh] overflow-hidden group mb-8 md:mb-12 cursor-pointer shadow-xl"
                >
                    <img src={getImageUrl(heroArticle.image)} alt={heroArticle.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>

                    <div className="absolute bottom-0 left-0 w-full">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 md:pb-16 w-full text-white">
                            <div className="md:w-3/4">
                                <span className="bg-[#bd2828] text-white text-[10px] md:text-xs font-bold px-2.5 py-0.5 md:py-1 rounded mb-3 md:mb-4 inline-block uppercase tracking-wider shadow-md">
                                    {heroArticle.categories?.name || "BERITA UTAMA"}
                                </span>

                                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-3 md:mb-4 line-clamp-3 md:line-clamp-none drop-shadow-lg group-hover:text-white-100 transition-colors">
                                    {heroArticle.title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-gray-300 font-medium mb-4 md:mb-6 opacity-90">
                                    <span>By <span className="text-white font-bold">{heroArticle.users?.name || "Admin NDN"}</span></span>
                                    <span className="hidden sm:inline text-gray-500">•</span>
                                    <span className="flex items-center gap-1">⏱️ 5 Min Baca</span>
                                    <span className="text-gray-500">•</span>
                                    <span>{formatDate(heroArticle.created_at)}</span>
                                </div>

                                <span className="bg-white text-gray-900 px-5 py-2.5 md:px-7 md:py-3.5 rounded text-xs md:text-sm font-bold group-hover:bg-white-50 group-hover:text-[#bd2828] transition-all duration-300 shadow-lg inline-block transform active:scale-95">
                                    Baca Selengkapnya →
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            ) : null}

            {/* === CONTAINER KONTEN BAWAH === */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">

                {/* === KOTAK PENCARIAN & FILTER KATEGORI (SEJAJAR) === */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    {/* Form Input Cari Berita */}
                    <div className="relative w-full lg:max-w-sm shrink-0">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari berita..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] text-gray-800 transition"
                        />
                        <svg className="w-4 h-4 absolute left-3.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>

                    {/* Deretan Tombol Tab Kategori & Dropdown */}
                    <div className="flex items-center justify-start lg:justify-end gap-2 overflow-x-auto w-full no-scrollbar">
                        <button
                            onClick={() => setActiveCategory("Semua")}
                            className={`whitespace-nowrap px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold transition shadow-sm border cursor-pointer ${activeCategory === "Semua" ? "bg-[#a31d1d] text-white border-[#a31d1d]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}
                        >
                            Semua
                        </button>

                        {top3Categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.name)}
                                className={`whitespace-nowrap px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold transition shadow-sm border cursor-pointer ${activeCategory === cat.name ? "bg-[#a31d1d] text-white border-[#a31d1d]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}
                            >
                                {cat.name}
                            </button>
                        ))}

                        {/* Dropdown Kategori Sisanya */}
                        {remainingCategories.length > 0 && (
                            <div className="relative shrink-0">
                                <select
                                    value={activeCategory !== "Semua" && !top3Categories.find(c => c.name === activeCategory) ? activeCategory : ""}
                                    onChange={(e) => setActiveCategory(e.target.value)}
                                    className={`whitespace-nowrap pl-4 pr-8 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold transition shadow-sm border cursor-pointer outline-none appearance-none ${activeCategory !== "Semua" && !top3Categories.find(c => c.name === activeCategory)
                                            ? "bg-[#a31d1d] text-white border-[#a31d1d]"
                                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                        }`}
                                >
                                    <option value="" disabled>Lainnya</option>
                                    {remainingCategories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                                <svg className={`w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeCategory !== "Semua" && !top3Categories.find(c => c.name === activeCategory) ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        )}
                    </div>
                </div>

                {/* === GRID LIST ARTIKEL BERITA === */}
                {filteredArticles.length === 0 ? (
                    <div className="text-center py-16 md:py-20 bg-white border border-gray-200 rounded-xl px-4 shadow-sm">
                        <p className="text-gray-400 text-sm md:text-base font-medium">Tidak ada artikel berita yang cocok dengan kata kunci atau kategori tersebut.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {(searchQuery ? filteredArticles : gridArticles).map((article) => (
                            <div key={article.id} className="bg-white rounded-xl shadow-sm border border-gray-100 transition duration-300 flex flex-col overflow-hidden group">

                                {/* Frame Gambar Berita tanpa animasi scale/zoom */}
                                <div className="relative h-44 md:h-48 overflow-hidden bg-gray-100 shrink-0">
                                    <img src={getImageUrl(article.image)} alt={article.title} className="w-full h-full object-cover" />
                                    <span className="absolute top-3 left-3 bg-white/90 text-[#a31d1d] text-[9px] font-extrabold px-2.5 py-1 rounded uppercase tracking-widest shadow-sm backdrop-blur-sm">
                                        {article.categories?.name || "BERITA"}
                                    </span>
                                </div>

                                <div className="p-4 md:p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <h3 className="font-serif font-bold text-lg md:text-xl text-gray-900 leading-snug line-clamp-2 group-hover:text-[#a31d1d] transition">
                                            {article.title}
                                        </h3>
                                        <p className="text-xs md:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                            {article.content.replace(/<[^>]+>/g, '')}
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-gray-50 pt-3 mt-2 shrink-0">
                                        <span className="text-[10px] md:text-[11px] font-bold text-gray-400">{formatDate(article.created_at)}</span>
                                        <Link to={`/artikel/${article.id}`} className="text-[#a31d1d] text-[11px] font-bold flex items-center gap-1 hover:underline">
                                            Baca <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                        </Link>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}