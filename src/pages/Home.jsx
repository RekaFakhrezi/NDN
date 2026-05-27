import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Home() {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [searchQuery, setSearchQuery] = useState("");
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
                /* Pembungkus luar menggunakan Link agar SELURUH GAMBAR bisa diklik */
                <Link
                    to={`/artikel/${heroArticle.id}`}
                    className="relative block w-full h-[55vh] sm:h-[65vh] md:h-[80vh] overflow-hidden group mb-8 md:mb-12 cursor-pointer shadow-xl"
                >
                    {/* GAMBAR DIAM: Animasi Hover/Gerak/Zoom dihapus agar elegan dan tidak bikin pusing */}
                    <img src={getImageUrl(heroArticle.image)} alt={heroArticle.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>

                    {/* Pembatas lebar agar teks judul tetap sejajar ke tengah, tidak ikut mentok ke ujung layar */}
                    <div className="absolute bottom-0 left-0 w-full">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 md:pb-16 w-full text-white">
                            <div className="md:w-3/4">
                                <span className="bg-[#bd2828] text-white text-[10px] md:text-xs font-bold px-2.5 py-0.5 md:py-1 rounded mb-3 md:mb-4 inline-block uppercase tracking-wider shadow-md">
                                    {heroArticle.categories?.name || "BERITA UTAMA"}
                                </span>

                                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-3 md:mb-4 line-clamp-3 md:line-clamp-none drop-shadow-lg group-hover:text-red-100 transition-colors">
                                    {heroArticle.title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-gray-300 font-medium mb-4 md:mb-6 opacity-90">
                                    <span>By <span className="text-white font-bold">{heroArticle.users?.name || "Admin NDN"}</span></span>
                                    <span className="hidden sm:inline text-gray-500">•</span>
                                    <span className="flex items-center gap-1">⏱️ 5 Min Baca</span>
                                    <span className="text-gray-500">•</span>
                                    <span>{formatDate(heroArticle.created_at)}</span>
                                </div>

                                {/* Tombol dirubah jadi elemen span agar aman dipakai di dalam tag Link */}
                                <span className="bg-white text-gray-900 px-5 py-2.5 md:px-7 md:py-3.5 rounded text-xs md:text-sm font-bold group-hover:bg-red-50 group-hover:text-[#bd2828] transition-all duration-300 shadow-lg inline-block transform active:scale-95">
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
                    <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar">
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

            </div>
        </div>
    );
}