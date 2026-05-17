import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Home() {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [searchQuery, setSearchQuery] = useState(""); // State baru untuk melacak pencarian
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // 1. Tarik daftar Kategori
                const { data: catData } = await supabase
                    .from("categories")
                    .select("*")
                    .order("name");

                if (catData) setCategories(catData);

                // 2. Tarik Artikel yang sudah disetujui admin
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
        return `https://qwhetscllvvbyufzeeyy.supabase.co/storage/v1/object/public/Article-Image/${cleanPath}`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return "Baru Saja";
        const date = new Date(isoString);
        return isNaN(date.getTime())
            ? "Baru Saja"
            : date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    // LOGIKA GANDA: Filter berdasarkan Kategori DAN Kolom Search Bar
    const filteredArticles = articles.filter(article => {
        const matchesCategory = activeCategory === "Semua" || article.categories?.name === activeCategory;
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Artikel paling pertama dari hasil filter dijadikan Headline Hero Utama
    const heroArticle = filteredArticles.length > 0 ? filteredArticles[0] : null;
    // Sisa artikel di bawahnya masuk ke grid biasa
    const gridArticles = filteredArticles.length > 1 ? filteredArticles.slice(1) : filteredArticles;

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
            <div className="max-w-7xl mx-auto px-6 pt-8">

                {/* === HEADLINE UTAMA (HERO SECTION) === */}
                {heroArticle && !searchQuery ? (
                    <div className="relative w-full h-[60vh] md:h-[70vh] rounded-2xl overflow-hidden shadow-xl mb-12 group">
                        <img src={getImageUrl(heroArticle.image)} alt={heroArticle.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-3/4 text-white">
                            <span className="bg-[#bd2828] text-white text-xs font-bold px-3 py-1 rounded mb-4 inline-block uppercase tracking-wider">{heroArticle.categories?.name || "BERITA UTAMA"}</span>
                            <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight mb-4">{heroArticle.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-300 font-medium mb-6">
                                <span>By {heroArticle.users?.name || "Admin NDN"}</span>
                                <span>•</span>
                                <span>⏱️ 5 Menit Baca</span>
                                <span>•</span>
                                <span>{formatDate(heroArticle.created_at)}</span>
                            </div>
                            <Link to={`/artikel/${heroArticle.id}`} className="bg-white text-gray-900 px-6 py-3 rounded text-sm font-bold hover:bg-gray-100 transition shadow-lg inline-block">Baca Selengkapnya</Link>
                        </div>
                    </div>
                ) : null}

                {/* === KOTAK PENCARIAN (SEARCH BAR) & FILTER KATEGORI === */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8 space-y-6">

                    {/* Form Input Cari Berita */}
                    <div className="relative w-full max-w-xl">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ketik kata kunci untuk mencari artikel berita..."
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] text-gray-800 transition"
                        />
                        <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>

                    {/* Deretan Tombol Tab Kategori */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-gray-100 pt-4 gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                            <button
                                onClick={() => setActiveCategory("Semua")}
                                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition shadow-sm border cursor-pointer ${activeCategory === "Semua" ? "bg-[#a31d1d] text-white border-[#a31d1d]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                    }`}
                            >
                                Semua Kategori
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.name)}
                                    className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition shadow-sm border cursor-pointer ${activeCategory === cat.name ? "bg-[#a31d1d] text-white border-[#a31d1d]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Urutan: <span className="text-[#a31d1d]">Terbaru ⌄</span>
                        </div>
                    </div>

                </div>

                {/* === GRID LIST ARTIKEL BERITA === */}
                {filteredArticles.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
                        <p className="text-gray-400 font-medium">Tidak ada artikel berita yang cocok dengan kata kunci atau kategori tersebut.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Jika sedang search, render seluruh filteredArticles ke grid tanpa memotong index 0 */}
                        {(searchQuery ? filteredArticles : gridArticles).map((article) => (
                            <div key={article.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition duration-300 flex flex-col overflow-hidden group">
                                <div className="relative h-48 overflow-hidden bg-gray-100">
                                    <img src={getImageUrl(article.image)} alt={article.title} className="w-full h-full object-cover group-hover:scale-103 transition duration-500" />
                                    <span className="absolute top-3 left-3 bg-white/90 text-[#a31d1d] text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-widest shadow-sm">
                                        {article.categories?.name || "BERITA"}
                                    </span>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-serif font-bold text-xl text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-[#a31d1d] transition">
                                            {article.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                            {article.content.replace(/<[^>]+>/g, '')}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-4">
                                        <span className="text-[11px] font-bold text-gray-400">{formatDate(article.created_at)}</span>
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